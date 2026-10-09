import type { DayRoutine, PlannedSet, WorkoutSession } from "@/types";

export function snapshotPlan(day: DayRoutine) {
  const plannedSetSnapshot: PlannedSet[] = day.exercises.flatMap(ex => ex.sets.map(s => ({ exerciseId: ex.id, setId: s.id, targetReps: s.targetReps, setType: "working" as const })));
  let hash = 2166136261;
  for (const char of JSON.stringify(plannedSetSnapshot)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return { plannedSetSnapshot, planVersion: `plan-1-${(hash >>> 0).toString(16)}` };
}
export type SessionTiming = Pick<WorkoutSession, "startedAt" | "endedAt" | "timezone" | "plannedSetSnapshot" | "planVersion" | "timestampQuality" | "localDate">;
