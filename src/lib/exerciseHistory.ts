import type { Exercise, SessionExercise, SessionSet, WeightUnit, WorkoutSession } from "@/types";
import { dateInTimezone, validLocalDate } from "./calendar";
import { parseInstant } from "./publicApi";
import { convertMass, numericLog, resolveSetLoad, roundMetric } from "./trainingMath";

export const EPLEY_MAX_REPS = 12;
export const ESTIMATE_METHOD = "epley_cap12" as const;

export interface RepRange {
  min: number;
  max: number;
}

export interface ExerciseTopSet {
  setId: string;
  reps: number;
  loadKg: number | null;
  loadKind: string;
  sourceWeight: number | null;
  sourceUnit: WeightUnit | null;
}

export interface ExerciseSessionSummary {
  sessionId: string;
  dayId: string;
  dayName: string;
  date: string | null;
  startedAt: string | null;
  timestampQuality: "observed" | "date_only" | "recorded_only";
  completedWorkingSets: number;
  completedWarmupSets: number;
  unmeasuredWorkingSets: number;
  topSet: ExerciseTopSet | null;
  knownWorkingVolumeKgReps: number;
  totalWorkingVolumeKgReps: number | null;
  estimated1RmKg: number | null;
  estimateMethod: typeof ESTIMATE_METHOD;
  isEstimate: true;
}

export interface RepPR {
  id: string;
  exerciseId: string;
  sessionId: string;
  setId: string;
  loadKg: number;
  reps: number;
  previousReps: number | null;
  unit: "kg";
  sourceWeight: number | null;
  sourceUnit: WeightUnit | null;
  achievedAt: string | null;
  timestampQuality: string;
}

export interface BestRepPRPerWeight {
  loadKg: number;
  reps: number;
  sourceWeight: number | null;
  sourceUnit: WeightUnit | null;
  sessionId: string;
  achievedAt: string | null;
}

const iso = (value: unknown) => typeof value === "string" && parseInstant(value) ? new Date(value).toISOString() : null;

export function getSessionDate(session: WorkoutSession, timezone = "UTC"): string | null {
  if (session.timestampQuality === "date_only" && validLocalDate(session.localDate)) return session.localDate;
  const timestamp = iso(session.startedAt) ?? iso(session.date);
  return timestamp ? dateInTimezone(timestamp, timezone) : validLocalDate(session.date) ? session.date : null;
}

export function getSessionTimeQuality(session: WorkoutSession): "observed" | "date_only" | "recorded_only" {
  return session.timestampQuality === "date_only" || validLocalDate(session.date)
    ? "date_only"
    : iso(session.startedAt)
      ? "observed"
      : "recorded_only";
}

/**
 * Parses targetReps string into a min/max rep range.
 * Supports "8-12", "8–12", "8 - 12", "5", etc.
 */
export function parseRepRange(targetReps: string | undefined | null): RepRange | null {
  if (!targetReps || typeof targetReps !== "string") return null;
  const trimmed = targetReps.trim();
  const rangeMatch = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (min > 0 && max >= min) return { min, max };
    return null;
  }
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    const reps = Number(singleMatch[1]);
    if (reps > 0) return { min: reps, max: reps };
  }
  return null;
}

/**
 * Calculates Epley estimated 1RM: load * (1 + reps / 30).
 * Strictly capped at reps <= 12. Returns null for reps > 12 or <= 0.
 */
export function calculateEpley1Rm(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isInteger(reps) || reps < 1 || reps > EPLEY_MAX_REPS) return null;
  return roundMetric(weight * (1 + reps / 30));
}

/**
 * Finds the planned rep range for an exercise from a template or plannedSetSnapshot.
 */
export function findPlannedRepRange(exerciseOrSets: { sets?: { targetReps?: string }[] } | undefined | null): RepRange | null {
  if (!exerciseOrSets?.sets || exerciseOrSets.sets.length === 0) return null;
  for (const s of exerciseOrSets.sets) {
    const parsed = parseRepRange(s.targetReps);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Extracts per-session history for a specific exercise ID.
 * Excludes warmups and unmeasured sets.
 * Respects stored units; null units stay unknown.
 */
export function extractExerciseSessionHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  timezone = "UTC"
): ExerciseSessionSummary[] {
  const result: ExerciseSessionSummary[] = [];

  // Sort sessions chronologically (oldest to newest)
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = getSessionDate(a, timezone) ?? "";
    const dateB = getSessionDate(b, timezone) ?? "";
    const dateOrder = dateA.localeCompare(dateB);
    if (dateOrder !== 0) return dateOrder;
    const timeA = iso(a.startedAt) ?? iso(a.date) ?? "";
    const timeB = iso(b.startedAt) ?? iso(b.date) ?? "";
    return timeA.localeCompare(timeB) || a.id.localeCompare(b.id);
  });

  for (const session of sortedSessions) {
    const matchingExercises = session.exercises.filter(
      (ex) => ex.exerciseId === exerciseId
    );
    if (matchingExercises.length === 0) continue;

    let completedWorkingSets = 0;
    let completedWarmupSets = 0;
    let unmeasuredWorkingSets = 0;
    let knownWorkingVolume = 0;
    let bestE1RmKg: number | null = null;
    let topSet: ExerciseTopSet | null = null;

    for (const ex of matchingExercises) {
      if (ex.type === "other") continue;

      for (const set of ex.sets) {
        if (!set.completed) continue;

        if (set.setType === "warmup") {
          completedWarmupSets++;
          continue;
        }

        completedWorkingSets++;
        const load = resolveSetLoad(set, session);

        if (!load.eligible) {
          unmeasuredWorkingSets++;
          continue;
        }

        const loadKg = load.loadKg!;
        const reps = load.reps!;
        const volume = loadKg * reps;
        knownWorkingVolume += volume;

        // Epley 1RM only for reps <= 12
        if (reps <= EPLEY_MAX_REPS && load.loadKind === "external") {
          const e1rm = calculateEpley1Rm(loadKg, reps);
          if (e1rm !== null && (bestE1RmKg === null || e1rm > bestE1RmKg)) {
            bestE1RmKg = e1rm;
          }
        }

        const sourceWeight = numericLog(set.loggedWeight);
        const sourceUnit = set.weightUnit ?? session.weightUnit ?? null;

        // Top set is chosen by highest loadKg, tie-break highest reps
        if (
          !topSet ||
          (topSet.loadKg !== null && loadKg > topSet.loadKg) ||
          (topSet.loadKg !== null && loadKg === topSet.loadKg && reps > topSet.reps) ||
          (topSet.loadKg === null && loadKg !== null)
        ) {
          topSet = {
            setId: set.setId,
            reps,
            loadKg: roundMetric(loadKg),
            loadKind: load.loadKind,
            sourceWeight,
            sourceUnit,
          };
        }
      }
    }

    if (completedWorkingSets === 0 && completedWarmupSets === 0) continue;

    result.push({
      sessionId: session.id,
      dayId: session.dayId,
      dayName: session.dayName,
      date: getSessionDate(session, timezone),
      startedAt: iso(session.startedAt) ?? iso(session.date),
      timestampQuality: getSessionTimeQuality(session),
      completedWorkingSets,
      completedWarmupSets,
      unmeasuredWorkingSets,
      topSet,
      knownWorkingVolumeKgReps: roundMetric(knownWorkingVolume),
      totalWorkingVolumeKgReps: unmeasuredWorkingSets > 0 ? null : roundMetric(knownWorkingVolume),
      estimated1RmKg: bestE1RmKg,
      estimateMethod: ESTIMATE_METHOD,
      isEstimate: true,
    });
  }

  return result;
}

/**
 * Detects rep PRs per weight for a specific exercise across all cloud history.
 * Tracks max reps achieved at each distinct loadKg.
 */
export function detectRepPRs(
  sessions: WorkoutSession[],
  exerciseId: string,
  timezone = "UTC"
): { prs: RepPR[]; allTimeBest: BestRepPRPerWeight[] } {
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = getSessionDate(a, timezone) ?? "";
    const dateB = getSessionDate(b, timezone) ?? "";
    const dateOrder = dateA.localeCompare(dateB);
    if (dateOrder !== 0) return dateOrder;
    const timeA = iso(a.startedAt) ?? iso(a.date) ?? "";
    const timeB = iso(b.startedAt) ?? iso(b.date) ?? "";
    return timeA.localeCompare(timeB) || a.id.localeCompare(b.id);
  });

  const bestRepsByLoad = new Map<number, number>();
  const prs: RepPR[] = [];
  const latestBestByLoad = new Map<number, BestRepPRPerWeight>();

  for (const session of sortedSessions) {
    const matchingExercises = session.exercises.filter((ex) => ex.exerciseId === exerciseId);

    for (const ex of matchingExercises) {
      if (ex.type === "other") continue;

      for (const set of ex.sets) {
        if (!set.completed || set.setType === "warmup") continue;

        const load = resolveSetLoad(set, session);
        if (!load.eligible || load.loadKg === null || load.loadKg <= 0 || load.reps === null) continue;

        const loadKg = roundMetric(load.loadKg);
        const reps = load.reps;
        const previousReps = bestRepsByLoad.get(loadKg) ?? null;

        if (previousReps === null || reps > previousReps) {
          bestRepsByLoad.set(loadKg, reps);

          const achievedAt =
            getSessionTimeQuality(session) === "date_only"
              ? null
              : iso(session.startedAt) ?? iso(session.recordedAt) ?? iso(session.date);

          const sourceWeight = numericLog(set.loggedWeight);
          const sourceUnit = set.weightUnit ?? session.weightUnit ?? null;

          const pr: RepPR = {
            id: `pr_${session.id}_${ex.exerciseId}_${set.setId}_${loadKg}_${reps}`,
            exerciseId,
            sessionId: session.id,
            setId: set.setId,
            loadKg,
            reps,
            previousReps,
            unit: "kg",
            sourceWeight,
            sourceUnit,
            achievedAt,
            timestampQuality: getSessionTimeQuality(session),
          };

          prs.push(pr);

          latestBestByLoad.set(loadKg, {
            loadKg,
            reps,
            sourceWeight,
            sourceUnit,
            sessionId: session.id,
            achievedAt,
          });
        }
      }
    }
  }

  const allTimeBest = [...latestBestByLoad.values()].sort((a, b) => b.loadKg - a.loadKg);
  return { prs, allTimeBest };
}

export interface ProgressionHintOptions {
  history: ExerciseSessionSummary[];
  plannedRepRange: RepRange | null;
  minSessions?: number;
  weightUnit?: WeightUnit;
}

/**
 * Computes a progression hint based on the exercise's planned rep range.
 * Requires enough data (default at least 3 sessions).
 * E.g., "last 3 sessions hit the top of the rep range at 60 kg → try 62.5 kg"
 */
export function computeProgressionHint({
  history,
  plannedRepRange,
  minSessions = 3,
  weightUnit = "kg",
}: ProgressionHintOptions): string | null {
  if (!plannedRepRange || minSessions < 1) return null;
  if (history.length < minSessions) return null;

  // Look at the last `minSessions` sessions
  const recent = history.slice(-minSessions);

  // All recent sessions must have a top set with known unit and load
  const firstTopSet = recent[0]?.topSet;
  if (!firstTopSet || firstTopSet.sourceWeight === null || firstTopSet.sourceUnit === null) return null;

  const targetWeight = firstTopSet.sourceWeight;
  const targetUnit = firstTopSet.sourceUnit;

  for (const session of recent) {
    const topSet = session.topSet;
    if (!topSet) return null;
    if (topSet.sourceWeight === null || topSet.sourceUnit === null) return null;

    // Must be performed at the exact same weight and unit
    if (topSet.sourceWeight !== targetWeight || topSet.sourceUnit !== targetUnit) return null;

    // Must have hit at least the top of the planned rep range
    if (topSet.reps < plannedRepRange.max) return null;
  }

  // Calculate recommended next weight increment
  const increment = targetUnit === "lbs" ? 5 : 2.5;
  const nextWeight = roundMetric(targetWeight + increment);

  return `last ${minSessions} sessions hit the top of the rep range at ${targetWeight} ${targetUnit} → try ${nextWeight} ${targetUnit}`;
}
