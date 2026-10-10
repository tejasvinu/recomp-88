import { createHash } from "node:crypto";
import type { BodyWeightEntry, WorkoutSession } from "@/types";
import { canonicalTimezone, dateInTimezone, shiftDate, validLocalDate } from "./calendar";
import { parseInstant } from "./publicApi";
import { sanitizeBodyWeightEntries, sanitizeSessionHistory } from "./sync";
import { convertMass, resolveSetLoad, roundMetric } from "./trainingMath";

export const CALCULATION_VERSION = "training-2";
const DAY_MS = 86_400_000;
const MAX_EXERCISES = 50;
const MAX_SETS = 500;
const MAX_RESPONSE_BYTES = 2_000_000;
export class TrainingApiError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export type TrainingWindow = { from: string; to: string; timezone: string; limit: number; cursor: string | null };
export type TrainingData = { sessions?: unknown; bodyWeightEntries?: unknown; revision?: number; lastSyncedAt?: string | Date | null; settings?: { timezone?: unknown } };
export const accountKey = (userId: string) => `rcpa_${createHash("sha256").update(`recomp-account-1:${userId}`).digest("base64url")}`;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("base64url");
const boundedId = (value: string) => value.length <= 200 ? value : `legacy_${digest(value)}`;
const iso = (value: unknown) => typeof value === "string" && parseInstant(value) ? new Date(value).toISOString() : null;
const millisIso = (value: number | undefined) => value !== undefined && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;

export function parseTrainingWindow(params: URLSearchParams, ownerTimezone: unknown, now = new Date()): TrainingWindow {
  const timezone = canonicalTimezone(params.get("timezone") ?? ownerTimezone ?? "UTC");
  if (!timezone) throw new TrainingApiError("invalid_timezone", 400, "timezone must be an IANA timezone");
  const to = params.get("to") ?? dateInTimezone(now, timezone);
  const from = params.get("from") ?? (validLocalDate(to) ? shiftDate(to, -27) : "");
  if (!validLocalDate(from) || !validLocalDate(to)) throw new TrainingApiError("invalid_date", 400, "from and to must be valid YYYY-MM-DD dates");
  const days = (Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / DAY_MS + 1;
  if (days < 1 || days > 366) throw new TrainingApiError("invalid_range", 400, "Use an inclusive range of 1 to 366 days");
  const rawLimit = params.get("limit") ?? "20";
  const limit = Number(rawLimit);
  if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new TrainingApiError("invalid_limit", 400, "limit must be 1 to 50");
  return { from, to, timezone, limit, cursor: params.get("cursor") };
}

function sessionDate(session: WorkoutSession, timezone: string): string | null {
  if (session.timestampQuality === "date_only" && validLocalDate(session.localDate)) return session.localDate;
  const timestamp = iso(session.startedAt) ?? iso(session.date);
  return timestamp ? dateInTimezone(timestamp, timezone) : validLocalDate(session.date) ? session.date : null;
}
function timeQuality(session: WorkoutSession) {
  return session.timestampQuality === "date_only" || validLocalDate(session.date) ? "date_only" : iso(session.startedAt) ? "observed" : "recorded_only";
}
function cursorOffset(window: TrainingWindow, binding: string, total: number): number {
  if (!window.cursor) return 0;
  try {
    if (window.cursor.length > 2048) throw new Error();
    const parsed = JSON.parse(Buffer.from(window.cursor, "base64url").toString());
    if (parsed.binding !== binding) throw new TrainingApiError("cursor_changed", 409, "The dataset, owner, endpoint or filters changed; restart pagination");
    if (!Number.isSafeInteger(parsed.offset) || parsed.offset < 0 || parsed.offset >= total) throw new Error();
    return parsed.offset;
  } catch (error) {
    if (error instanceof TrainingApiError) throw error;
    throw new TrainingApiError("invalid_cursor", 400, "Invalid cursor");
  }
}
function pageFor(window: TrainingWindow, binding: string, offset: number, returned: number, total: number) {
  const nextOffset = offset + returned;
  const hasMore = nextOffset < total;
  return { limit: window.limit, returned, total, hasMore,
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ binding, offset: nextOffset })).toString("base64url") : null };
}

function mapSession(session: WorkoutSession, timezone: string) {
  const completed = session.exercises.flatMap(ex => ex.sets).filter(s => s.completed === true);
  const working = completed.filter(s => s.setType !== "warmup");
  const planned = session.plannedSetSnapshot?.filter(s => s.setType !== "warmup") ?? null;
  const completedPlannedSets = planned?.filter(p => session.exercises.some(ex => ex.exerciseId === p.exerciseId && ex.sets.some(s => s.setId === p.setId && s.completed === true && s.setType !== "warmup"))).length ?? null;
  let remaining = MAX_SETS;
  const exercises = session.exercises.slice(0, MAX_EXERCISES).map(ex => {
    const selected = ex.sets.slice(0, remaining);
    remaining -= selected.length;
    return { id: ex.exerciseId, displayName: ex.name.slice(0, 200), type: ex.type,
      sets: selected.map(s => {
        const load = resolveSetLoad(s, session);
        return { id: s.setId, completed: s.completed === true, setType: s.setType ?? "working", isExtra: s.isExtra === true,
          targetReps: s.targetReps.slice(0, 128), reps: load.reps, loadKg: load.loadKg, loadKind: load.loadKind,
          offsetKg: load.offsetKg, sourceUnit: s.weightUnit ?? session.weightUnit ?? null,
          volumeKgReps: load.volumeKgReps === null ? null : roundMetric(load.volumeKgReps),
          rpe: s.rpe ?? null, completedAt: millisIso(s.completedAt),
          measurementQuality: load.eligible ? "known" : s.completed ? "unknown" : "uncompleted" };
      }),
      coverage: { totalSets: ex.sets.length, returnedSets: selected.length, complete: ex.sets.length === selected.length },
    };
  });
  const totals = session.exercises.filter(ex => ex.type !== "other").flatMap(ex => ex.sets)
    .filter(s => s.completed === true && s.setType !== "warmup").map(s => resolveSetLoad(s, session));
  const knownVolumeKgReps = roundMetric(totals.reduce((sum, s) => sum + (s.volumeKgReps ?? 0), 0));
  const unknownLoadSets = totals.filter(s => s.volumeKgReps === null).length;
  const setCount = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const returnedSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return { id: session.id, version: session.version ?? 0, date: sessionDate(session, timezone), timezone,
    sourceTimezone: session.timezone ?? null, startedAt: iso(session.startedAt), endedAt: iso(session.endedAt),
    recordedAt: iso(session.recordedAt) ?? (timeQuality(session) === "recorded_only" ? iso(session.date) : null),
    updatedAt: iso(session.updatedAt), timestampQuality: timeQuality(session),
    planDay: { id: boundedId(session.dayId), name: session.dayName.slice(0, 200) }, planVersion: session.planVersion ? boundedId(session.planVersion) : null,
    scheduledOccurrenceId: session.scheduledOccurrenceId ? boundedId(session.scheduledOccurrenceId) : null,
    durationSeconds: typeof session.duration === "number" && session.duration >= 0 ? session.duration : null,
    bodyWeightKg: session.bodyWeightSnapshot !== undefined && (session.bodyWeightUnit ?? session.weightUnit)
      ? roundMetric(convertMass(session.bodyWeightSnapshot, (session.bodyWeightUnit ?? session.weightUnit)!, "kg")) : null,
    exercises, volumeKgReps: unknownLoadSets ? null : knownVolumeKgReps, knownVolumeKgReps,
    completionQuality: { recordedSets: setCount, completedSets: completed.length, completedWorkingSets: working.length,
      completedWarmupSets: completed.length - working.length, plannedWorkingSets: planned?.length ?? null, completedPlannedSets,
      plannedCompletionRatio: planned?.length ? completedPlannedSets! / planned.length : null,
      attendanceEligible: working.length > 0, attendancePolicy: "at_least_one_completed_non_warmup_set", unknownLoadSets },
    detailCoverage: { totalExercises: session.exercises.length, returnedExercises: exercises.length, totalSets: setCount,
      returnedSets, complete: setCount === returnedSets && session.exercises.length === exercises.length },
  };
}

function personalRecords(sessions: WorkoutSession[], visibleSets: Set<string>) {
  const best = new Map<string, number>();
  const records: { id: string; exerciseId: string; sessionId: string; setId: string; metric: string; loadKind: string; value: number; previousValue: number | null; unit: string; achievedAt: string | null; timestampQuality: string }[] = [];
  for (const session of sessions) for (const ex of session.exercises) for (const set of ex.sets) {
    if (ex.type === "other" || set.setType === "warmup") continue;
    const load = resolveSetLoad(set, session);
    if (!load.eligible) continue;
    for (const [metric, value, unit] of [["max_load", load.loadKg, "kg"], ["estimated_1rm", load.estimated1RmKg, "kg"]] as const) {
      if (value === null || value <= 0) continue;
      const key = `${ex.exerciseId}|${load.loadKind}|${metric}`;
      const previousValue = best.get(key) ?? null;
      if (previousValue !== null && value <= previousValue) continue;
      best.set(key, value);
      if (visibleSets.has(JSON.stringify([session.id, ex.exerciseId, set.setId]))) records.push({ id: digest([session.id, ex.exerciseId, set.setId, metric]),
        exerciseId: ex.exerciseId, sessionId: session.id, setId: set.setId, metric, loadKind: load.loadKind,
        value: roundMetric(value), previousValue: previousValue === null ? null : roundMetric(previousValue), unit,
        achievedAt: timeQuality(session) === "date_only" ? null : iso(session.startedAt) ?? iso(session.recordedAt) ?? iso(session.date), timestampQuality: timeQuality(session) });
    }
  }
  return records;
}

export function buildTrainingSummary(data: TrainingData | null, userId: string, window: TrainingWindow, resource = "training/summary") {
  const all = sanitizeSessionHistory(data?.sessions).map(s => ({ ...s, id: boundedId(s.id), exercises: s.exercises.map(ex => ({ ...ex,
    exerciseId: boundedId(ex.exerciseId), sets: ex.sets.map(set => ({ ...set, setId: boundedId(set.setId) })) })),
    plannedSetSnapshot: s.plannedSetSnapshot?.map(p => ({ ...p, exerciseId: boundedId(p.exerciseId), setId: boundedId(p.setId) })),
  })).sort((a,b) => {
    const dateOrder = (sessionDate(a, window.timezone) ?? "").localeCompare(sessionDate(b, window.timezone) ?? "");
    return dateOrder || (iso(a.startedAt) ?? iso(a.date) ?? "").localeCompare(iso(b.startedAt) ?? iso(b.date) ?? "") || a.id.localeCompare(b.id);
  });
  const matching = all.filter(s => { const date = sessionDate(s, window.timezone); return date && date >= window.from && date <= window.to; });
  const revision = data?.revision ?? 0;
  const binding = digest([CALCULATION_VERSION, resource, userId, revision, window.from, window.to, window.timezone]);
  const offset = cursorOffset(window, binding, matching.length);
  const mapped = matching.map(s => mapSession(s, window.timezone));
  const sessions = mapped.slice(offset, offset + window.limit);
  const prs = personalRecords(all, new Set(sessions.flatMap(s => s.exercises.flatMap(ex => ex.sets.map(set => JSON.stringify([s.id, ex.id, set.id]))))));
  const weeks = new Map<string, { weekStart: string; from: string; to: string; sessionCount: number; attendedSessions: number; completedWorkingSets: number; completedWarmupSets: number; knownVolumeKgReps: number; unknownLoadSets: number }>();
  for (let day = window.from; day <= window.to; day = shiftDate(day, 1)) {
    const weekday = new Date(`${day}T00:00Z`).getUTCDay();
    const weekStart = shiftDate(day, -((weekday + 6) % 7));
    if (!weeks.has(weekStart)) weeks.set(weekStart, { weekStart, from: day, to: day, sessionCount: 0, attendedSessions: 0, completedWorkingSets: 0, completedWarmupSets: 0, knownVolumeKgReps: 0, unknownLoadSets: 0 });
    weeks.get(weekStart)!.to = day;
  }
  for (const s of mapped) {
    const weekStart = shiftDate(s.date!, -((new Date(`${s.date}T00:00Z`).getUTCDay() + 6) % 7));
    const week = weeks.get(weekStart)!;
    week.sessionCount++; week.attendedSessions += Number(s.completionQuality.attendanceEligible);
    week.completedWorkingSets += s.completionQuality.completedWorkingSets;
    week.completedWarmupSets += s.completionQuality.completedWarmupSets;
    week.knownVolumeKgReps += s.knownVolumeKgReps; week.unknownLoadSets += s.completionQuality.unknownLoadSets;
  }
  const result = { schemaVersion: 2, calculationVersion: CALCULATION_VERSION, accountKey: accountKey(userId), revision,
    lastSyncedAt: data?.lastSyncedAt ? new Date(data.lastSyncedAt).toISOString() : null,
    timezone: window.timezone, from: window.from, to: window.to, massUnit: "kg", volumeUnit: "kg_reps",
    sessions, personalRecords: prs, estimateMethod: "epley_cap15",
    weeklyTrainingLoad: [...weeks.values()].map(w => ({ ...w, knownVolumeKgReps: roundMetric(w.knownVolumeKgReps), volumeKgReps: w.unknownLoadSets ? null : roundMetric(w.knownVolumeKgReps), completeWeek: w.from === w.weekStart && w.to === shiftDate(w.weekStart, 6) })),
    adherence: { status: "unconfigured", scheduledOccurrences: null, completedOccurrences: null },
    page: pageFor(window, binding, offset, sessions.length, matching.length),
    coverage: { scope: "cloud_ledger_only", observationCoverage: "unknown", aggregatesIncludeAllMatchingSessions: true,
      discardedSessionRecords: Array.isArray(data?.sessions) ? data.sessions.length - all.length : 0,
      personalRecordBaseline: "eligible_cloud_history",
      invalidDateSessions: all.filter(s => sessionDate(s, window.timezone) === null).length,
      unknownLoadSessions: mapped.filter(s => s.completionQuality.unknownLoadSets > 0).length,
      unknownPlanSessions: mapped.filter(s => s.completionQuality.plannedWorkingSets === null).length,
      legacyTimestampSessions: mapped.filter(s => s.timestampQuality === "recorded_only").length,
      dateOnlySessions: mapped.filter(s => s.timestampQuality === "date_only").length,
      detailTruncatedSessionIds: sessions.filter(s => !s.detailCoverage.complete).map(s => s.id),
      detailPageComplete: offset === 0 && sessions.length === matching.length,
    },
  };
  // Reduce only detail, preserving full-range aggregates and making every cap visible.
  while (Buffer.byteLength(JSON.stringify(result)) > MAX_RESPONSE_BYTES && result.sessions.length > 1) {
    result.sessions.pop();
    const ids = new Set(result.sessions.map(s => s.id));
    result.personalRecords = prs.filter(pr => ids.has(pr.sessionId));
    result.page = pageFor(window, binding, offset, result.sessions.length, matching.length);
    result.coverage.detailPageComplete = false;
    result.coverage.detailTruncatedSessionIds = result.sessions.filter(s => !s.detailCoverage.complete).map(s => s.id);
  }
  return result;
}

export function buildBodyWeightPage(data: TrainingData | null, userId: string, window: TrainingWindow) {
  const entries = sanitizeBodyWeightEntries(data?.bodyWeightEntries).filter(e => validLocalDate(e.date) && e.date >= window.from && e.date <= window.to).sort((a,b) => a.date.localeCompare(b.date));
  const revision = data?.revision ?? 0;
  const binding = digest(["body-weight-2", userId, revision, window.from, window.to, window.timezone]);
  const offset = cursorOffset(window, binding, entries.length);
  const items = entries.slice(offset, offset + window.limit).map((e: BodyWeightEntry) => ({ id: `weight:${e.date}`, date: e.date,
    timezone: e.timezone ?? null, requestedTimezone: window.timezone, timestampQuality: "date_only",
    kilograms: e.weightUnit ? roundMetric(convertMass(e.weight, e.weightUnit, "kg")) : null,
    sourceValue: e.weight, sourceUnit: e.weightUnit ?? null, recordedAt: iso(e.recordedAt), updatedAt: iso(e.updatedAt) }));
  return { schemaVersion: 2, accountKey: accountKey(userId), revision, from: window.from, to: window.to, timezone: window.timezone,
    massUnit: "kg", items, page: pageFor(window, binding, offset, items.length, entries.length),
    coverage: { scope: "cloud_ledger_only", observationCoverage: "unknown", unknownUnitEntries: entries.filter(e => !e.weightUnit).length, dateSemantics: "inclusive_stored_calendar_labels" } };
}
