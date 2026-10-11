import { createHash } from "node:crypto";
import type { WorkoutTemplate, ExerciseWiki } from "@/types";
import {
  CALCULATION_VERSION,
  accountKey,
  type TrainingData,
  type TrainingWindow,
  TrainingApiError,
} from "./trainingApi";
import { sanitizeSessionHistory } from "./sync";
import {
  computeProgressionHint,
  detectRepPRs,
  extractExerciseSessionHistory,
  findPlannedRepRange,
  getSessionDate,
  parseRepRange,
} from "./exerciseHistory";

const MAX_RESPONSE_BYTES = 2_000_000;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("base64url");
const boundedId = (value: string) => value.length <= 200 ? value : `legacy_${digest(value)}`;

export interface ExerciseListItem {
  id: string;
  name: string;
  type: "strength" | "hypertrophy" | "other";
  plannedRepRange: string | null;
  totalSessions: number;
  lastPerformedDate: string | null;
  lastPerformedSessionId: string | null;
}

export interface ExerciseMetadata {
  id: string;
  name: string;
  type: "strength" | "hypertrophy" | "other";
  plannedRepRange: string | null;
}

function cursorOffset(window: TrainingWindow, binding: string, total: number): number {
  if (!window.cursor) return 0;
  try {
    if (window.cursor.length > 2048) throw new Error();
    const parsed = JSON.parse(Buffer.from(window.cursor, "base64url").toString());
    if (parsed.binding !== binding) {
      throw new TrainingApiError("cursor_changed", 409, "The dataset, owner, endpoint or filters changed; restart pagination");
    }
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
  return {
    limit: window.limit,
    returned,
    total,
    hasMore,
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ binding, offset: nextOffset })).toString("base64url") : null,
  };
}

/**
 * Builds the list of owner's exercises with last-performed dates.
 * Discovered from workoutTemplate, customExercises, and session history.
 */
export function buildExerciseList(
  data: (TrainingData & { workoutTemplate?: unknown; customExercises?: unknown }) | null,
  userId: string,
  ownerTimezone = "UTC"
) {
  const template = Array.isArray(data?.workoutTemplate) ? (data.workoutTemplate as WorkoutTemplate) : [];
  const custom = Array.isArray(data?.customExercises) ? (data.customExercises as ExerciseWiki[]) : [];
  const sessions = sanitizeSessionHistory(data?.sessions);

  const exercisesMap = new Map<string, ExerciseListItem>();

  // 1. From template
  for (const day of template) {
    if (!Array.isArray(day?.exercises)) continue;
    for (const ex of day.exercises) {
      if (!ex?.id || !ex?.name) continue;
      const id = boundedId(ex.id);
      const repRange = findPlannedRepRange(ex);
      exercisesMap.set(id, {
        id,
        name: ex.name.slice(0, 200),
        type: ex.type === "strength" || ex.type === "hypertrophy" ? ex.type : "other",
        plannedRepRange: repRange ? (repRange.min === repRange.max ? String(repRange.min) : `${repRange.min}-${repRange.max}`) : null,
        totalSessions: 0,
        lastPerformedDate: null,
        lastPerformedSessionId: null,
      });
    }
  }

  // 2. From custom exercises
  for (const c of custom) {
    if (!c?.id || !c?.name) continue;
    const id = boundedId(c.id);
    if (!exercisesMap.has(id)) {
      exercisesMap.set(id, {
        id,
        name: c.name.slice(0, 200),
        type: "hypertrophy",
        plannedRepRange: null,
        totalSessions: 0,
        lastPerformedDate: null,
        lastPerformedSessionId: null,
      });
    }
  }

  // 3. From sessions
  for (const s of sessions) {
    const sDate = getSessionDate(s, ownerTimezone);
    for (const ex of s.exercises) {
      const id = boundedId(ex.exerciseId);
      const existing = exercisesMap.get(id);
      if (!existing) {
        exercisesMap.set(id, {
          id,
          name: ex.name.slice(0, 200),
          type: ex.type === "strength" || ex.type === "hypertrophy" ? ex.type : "other",
          plannedRepRange: null,
          totalSessions: 1,
          lastPerformedDate: sDate,
          lastPerformedSessionId: s.id,
        });
      } else {
        existing.totalSessions++;
        if (sDate && (!existing.lastPerformedDate || sDate.localeCompare(existing.lastPerformedDate) > 0)) {
          existing.lastPerformedDate = sDate;
          existing.lastPerformedSessionId = s.id;
        }
      }
    }
  }

  const list = [...exercisesMap.values()].sort((a, b) => {
    // Exercises with last-performed date come first, sorted descending
    if (a.lastPerformedDate && b.lastPerformedDate) {
      const diff = b.lastPerformedDate.localeCompare(a.lastPerformedDate);
      if (diff !== 0) return diff;
    } else if (a.lastPerformedDate && !b.lastPerformedDate) {
      return -1;
    } else if (!a.lastPerformedDate && b.lastPerformedDate) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    schemaVersion: 2,
    accountKey: accountKey(userId),
    revision: data?.revision ?? 0,
    timezone: ownerTimezone,
    lastSyncedAt: data?.lastSyncedAt ? new Date(data.lastSyncedAt).toISOString() : null,
    exercises: list,
    total: list.length,
  };
}

/**
 * Finds metadata for an exercise by ID.
 */
export function findExerciseMetadata(
  data: (TrainingData & { workoutTemplate?: unknown; customExercises?: unknown }) | null,
  exerciseId: string
): ExerciseMetadata | null {
  const targetId = boundedId(exerciseId);
  const template = Array.isArray(data?.workoutTemplate) ? (data.workoutTemplate as WorkoutTemplate) : [];
  for (const day of template) {
    if (!Array.isArray(day?.exercises)) continue;
    for (const ex of day.exercises) {
      if (boundedId(ex.id) === targetId) {
        const repRange = findPlannedRepRange(ex);
        return {
          id: targetId,
          name: ex.name.slice(0, 200),
          type: ex.type === "strength" || ex.type === "hypertrophy" ? ex.type : "other",
          plannedRepRange: repRange ? (repRange.min === repRange.max ? String(repRange.min) : `${repRange.min}-${repRange.max}`) : null,
        };
      }
    }
  }

  const custom = Array.isArray(data?.customExercises) ? (data.customExercises as ExerciseWiki[]) : [];
  for (const c of custom) {
    if (boundedId(c.id) === targetId) {
      return {
        id: targetId,
        name: c.name.slice(0, 200),
        type: "hypertrophy",
        plannedRepRange: null,
      };
    }
  }

  const sessions = sanitizeSessionHistory(data?.sessions);
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (boundedId(ex.exerciseId) === targetId) {
        // Try planned set snapshot for rep range
        const plannedSets = s.plannedSetSnapshot?.filter((p) => boundedId(p.exerciseId) === targetId);
        const repRange = plannedSets && plannedSets.length > 0 ? parseRepRange(plannedSets[0].targetReps) : null;
        return {
          id: targetId,
          name: ex.name.slice(0, 200),
          type: ex.type === "strength" || ex.type === "hypertrophy" ? ex.type : "other",
          plannedRepRange: repRange ? (repRange.min === repRange.max ? String(repRange.min) : `${repRange.min}-${repRange.max}`) : null,
        };
      }
    }
  }

  return null;
}

/**
 * Builds the paginated exercise history page for GET /api/v2/exercises/{id}/history.
 */
export function buildExerciseHistoryPage(
  data: (TrainingData & { workoutTemplate?: unknown; customExercises?: unknown }) | null,
  userId: string,
  exerciseId: string,
  window: TrainingWindow
) {
  const meta = findExerciseMetadata(data, exerciseId);
  if (!meta) {
    throw new TrainingApiError("exercise_not_found", 404, `Exercise '${exerciseId}' not found`);
  }

  const allSessions = sanitizeSessionHistory(data?.sessions).map((s) => ({
    ...s,
    id: boundedId(s.id),
    exercises: s.exercises.map((ex) => ({
      ...ex,
      exerciseId: boundedId(ex.exerciseId),
      sets: ex.sets.map((set) => ({ ...set, setId: boundedId(set.setId) })),
    })),
  }));

  const fullHistory = extractExerciseSessionHistory(allSessions, meta.id, window.timezone);

  // Filter within date range [from, to]
  const matching = fullHistory.filter((s) => {
    return s.date && s.date >= window.from && s.date <= window.to;
  });

  const revision = data?.revision ?? 0;
  const binding = digest([
    CALCULATION_VERSION,
    "exercise/history",
    userId,
    revision,
    meta.id,
    window.from,
    window.to,
    window.timezone,
  ]);

  const offset = cursorOffset(window, binding, matching.length);
  const pagedHistory = matching.slice(offset, offset + window.limit);

  // Detect rep PRs across all eligible cloud history
  const { prs, allTimeBest } = detectRepPRs(allSessions, meta.id, window.timezone);
  const pagedSessionIds = new Set(pagedHistory.map((s) => s.sessionId));
  const pagePrs = prs.filter((pr) => pagedSessionIds.has(pr.sessionId));

  // Compute progression hint based on all history up to the end of the window
  const historyUpToWindow = fullHistory.filter((s) => !s.date || s.date <= window.to);
  const plannedRepRange = parseRepRange(meta.plannedRepRange);
  const progressionHint = computeProgressionHint({
    history: historyUpToWindow,
    plannedRepRange,
    minSessions: 3,
  });

  const result = {
    schemaVersion: 2,
    calculationVersion: CALCULATION_VERSION,
    accountKey: accountKey(userId),
    revision,
    lastSyncedAt: data?.lastSyncedAt ? new Date(data.lastSyncedAt).toISOString() : null,
    timezone: window.timezone,
    from: window.from,
    to: window.to,
    massUnit: "kg",
    volumeUnit: "kg_reps",
    exercise: meta,
    history: pagedHistory,
    personalRecords: pagePrs,
    allTimeBestRepPRs: allTimeBest,
    progressionHint,
    page: pageFor(window, binding, offset, pagedHistory.length, matching.length),
    coverage: {
      scope: "cloud_ledger_only",
      observationCoverage: "unknown",
      aggregatesIncludeAllMatchingSessions: true,
      personalRecordBaseline: "eligible_cloud_history",
      discardedSessionRecords: Array.isArray(data?.sessions) ? data.sessions.length - allSessions.length : 0,
      invalidDateSessions: allSessions.filter((s) => getSessionDate(s, window.timezone) === null).length,
      unknownLoadSessions: matching.filter((s) => s.unmeasuredWorkingSets > 0).length,
      unknownPlanSessions: plannedRepRange === null ? 1 : 0,
      legacyTimestampSessions: matching.filter((s) => s.timestampQuality === "recorded_only").length,
      dateOnlySessions: matching.filter((s) => s.timestampQuality === "date_only").length,
      detailTruncatedSessionIds: pagedHistory.filter((s) => !s.topSet).map((s) => s.sessionId),
      detailPageComplete: offset === 0 && pagedHistory.length === matching.length,
    },
  };

  // 2MB response budget protection
  while (Buffer.byteLength(JSON.stringify(result)) > MAX_RESPONSE_BYTES && result.history.length > 1) {
    result.history.pop();
    const ids = new Set(result.history.map((s) => s.sessionId));
    result.personalRecords = pagePrs.filter((pr) => ids.has(pr.sessionId));
    result.page = pageFor(window, binding, offset, result.history.length, matching.length);
    result.coverage.detailPageComplete = false;
    result.coverage.detailTruncatedSessionIds = result.history.filter((s) => !s.topSet).map((s) => s.sessionId);
  }

  return result;
}
