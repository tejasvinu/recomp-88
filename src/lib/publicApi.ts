import type { WeightUnit } from "@/types";
import { canonicalTimezone, dateInTimezone } from "./calendar";
import { convertMass } from "./trainingMath";

const DAY_MS = 24 * 60 * 60 * 1000;
export interface ApiWindow { since: Date; until: Date }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validCalendarDate(year: number, month: number, day: number) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

export function parseInstant(value: string): Date | null {
  // Require a timezone: date-only strings and local datetimes are not instants.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?([Zz]|[+-](\d{2}):?(\d{2}))$/);
  if (!match || !validCalendarDate(+match[1], +match[2], +match[3]) ||
    +match[4] > 23 || +match[5] > 59 || +(match[6] ?? 0) > 59 ||
    +(match[8] ?? 0) > 23 || +(match[9] ?? 0) > 59) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function parseApiWindow(params: URLSearchParams, now = new Date()): ApiWindow | { error: string } {
  const untilValue = params.get("until");
  const sinceValue = params.get("since");
  const until = untilValue === null ? new Date(now) : parseInstant(untilValue);
  if (!until) return { error: "until must be an ISO 8601 instant with a timezone" };
  const since = sinceValue === null ? new Date(until.getTime() - 28 * DAY_MS) : parseInstant(sinceValue);
  if (!since) return { error: "since must be an ISO 8601 instant with a timezone" };
  if (since >= until) return { error: "since must be before until" };
  if (until.getTime() - since.getTime() > 400 * DAY_MS) return { error: "Date range must not exceed 400 days" };
  return { since, until };
}

function numericLog(value: unknown): number | null {
  if (typeof value !== "string" || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) return null;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

function mapExercise(exercise: Record<string, unknown>, sourceUnit?: WeightUnit, outputUnit?: WeightUnit) {
  const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
  let completedSets = 0;
  let topSet: { weight: number; reps: number } | null = null;
  for (const set of sets) {
    if (!isRecord(set) || set.completed !== true) continue;
    completedSets++;
    const rawWeight = numericLog(set.loggedWeight);
    const setUnit = set.weightUnit === "kg" || set.weightUnit === "lbs" ? set.weightUnit : sourceUnit;
    const weight = rawWeight !== null && setUnit && outputUnit ? convertMass(rawWeight, setUnit, outputUnit) : rawWeight;
    const reps = numericLog(set.loggedReps);
    if (weight === null || reps === null) continue;
    if (!topSet || weight > topSet.weight || (weight === topSet.weight && reps > topSet.reps)) {
      topSet = { weight, reps };
    }
  }
  return {
    name: typeof exercise.name === "string" ? exercise.name : "",
    type: exercise.type === "strength" || exercise.type === "hypertrophy" ? exercise.type : "other",
    completedSets, totalSets: sets.length, topSet,
  };
}

export function mapPublicSessions(value: unknown, window: ApiWindow, outputUnit?: WeightUnit) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((session) => {
    if (!isRecord(session) || typeof session.date !== "string") return [];
    const timestamp = Date.parse(typeof session.startedAt === "string" ? session.startedAt : session.date);
    if (!Number.isFinite(timestamp) || timestamp < window.since.getTime() || timestamp >= window.until.getTime()) return [];
    const sourceUnit = session.weightUnit === "kg" || session.weightUnit === "lbs" ? session.weightUnit : undefined;
    const exercises = Array.isArray(session.exercises) ? session.exercises.filter(isRecord).map(ex => mapExercise(ex, sourceUnit, outputUnit)) : [];
    return [{
      id: typeof session.id === "string" ? session.id : "",
      startedAt: new Date(timestamp).toISOString(),
      dayName: typeof session.dayName === "string" ? session.dayName : "",
      durationMinutes: typeof session.duration === "number" && Number.isFinite(session.duration) ? Math.round(session.duration / 60) : null,
      exerciseCount: exercises.length,
      completedSets: exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0),
      totalSets: exercises.reduce((sum, exercise) => sum + exercise.totalSets, 0),
      totalTonnage: typeof session.totalTonnage === "number" && Number.isFinite(session.totalTonnage) ? sourceUnit && outputUnit ? convertMass(session.totalTonnage, sourceUnit, outputUnit) : session.totalTonnage : null,
      exercises,
    }];
  }).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).slice(0, 1000);
}

export function mapPublicBodyWeight(value: unknown, window: ApiWindow, timezone = "UTC", outputUnit?: WeightUnit) {
  if (!Array.isArray(value)) return [];
  const since = dateInTimezone(window.since, timezone);
  const until = dateInTimezone(window.until, timezone);
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      !validCalendarDate(+entry.date.slice(0, 4), +entry.date.slice(5, 7), +entry.date.slice(8, 10)) ||
      entry.date < since || entry.date >= until || typeof entry.weight !== "number" || !Number.isFinite(entry.weight)) return [];
    const sourceUnit = entry.weightUnit === "kg" || entry.weightUnit === "lbs" ? entry.weightUnit : undefined;
    return [{ date: entry.date, weight: sourceUnit && outputUnit ? convertMass(entry.weight, sourceUnit, outputUnit) : entry.weight }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export interface PublicApiData {
  sessions?: unknown;
  bodyWeightEntries?: unknown;
  settings?: { weightUnit?: unknown; timezone?: unknown } | null;
  lastSyncedAt?: Date | string | null;
}

export function publicWeightUnit(data: PublicApiData | null, fallback: unknown): WeightUnit {
  const unit = data?.settings?.weightUnit;
  return unit === "kg" || unit === "lbs" ? unit : fallback === "lbs" ? "lbs" : "kg";
}

export function mapPublicMe(user: { name?: string | null; weightUnit?: unknown }, data: PublicApiData | null) {
  const timestamp = data?.lastSyncedAt ? new Date(data.lastSyncedAt).getTime() : NaN;
  return {
    schemaVersion: 1,
    user: { name: typeof user.name === "string" ? user.name : null },
    weightUnit: publicWeightUnit(data, user.weightUnit),
    lastSyncedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    sessionCount: Array.isArray(data?.sessions) ? data.sessions.length : 0,
  };
}

export function mapPublicWorkouts(data: PublicApiData | null, fallbackUnit: unknown, window: ApiWindow) {
  return {
    schemaVersion: 1,
    weightUnit: publicWeightUnit(data, fallbackUnit),
    since: window.since.toISOString(), until: window.until.toISOString(),
    sessions: mapPublicSessions(data?.sessions, window, publicWeightUnit(data, fallbackUnit)),
    bodyWeight: mapPublicBodyWeight(data?.bodyWeightEntries, window, canonicalTimezone(data?.settings?.timezone) ?? "UTC", publicWeightUnit(data, fallbackUnit)),
  };
}
