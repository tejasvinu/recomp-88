import { describe, expect, it } from "vitest";
import { mapPublicWorkouts } from "./publicApi";
import { buildWorkoutSession } from "@/services/workoutService";
import type { DayRoutine } from "@/types";
import { sanitizeSyncPayload } from "./sync";
import { resolveSetLoad } from "./trainingMath";

describe("historic dates, units and planned denominator", () => {
  it("filters weight dates in the configured owner timezone", () => {
    const data = { settings: { weightUnit: "kg", timezone: "Asia/Kolkata" }, bodyWeightEntries: [
      { date: "2026-10-02", weight: 80 }, { date: "2026-10-03", weight: 81 }, { date: "2026-10-09", weight: 82 },
    ] };
    expect(mapPublicWorkouts(data, "kg", { since: new Date("2026-10-02T18:30Z"), until: new Date("2026-10-09T18:30Z") }).bodyWeight.map(e => e.date)).toEqual(["2026-10-03", "2026-10-09"]);
  });
  it("converts a tagged old measurement rather than relabelling it", () => {
    const data = { settings: { weightUnit: "lbs" }, bodyWeightEntries: [{ date: "2026-10-09", weight: 80, weightUnit: "kg" }] };
    expect(mapPublicWorkouts(data, "kg", { since: new Date("2026-10-09T00:00Z"), until: new Date("2026-10-10T00:00Z") }).bodyWeight[0].weight).toBeCloseTo(176.3698, 3);
  });
  it("snapshots unrecorded planned sets and separates actual start from save time", () => {
    const day: DayRoutine = { id: "d", dayNumber: 1, title: "Push", name: "Push", exercises: [{ id: "e", name: "Press", type: "strength", sets: [1,2,3].map(n => ({ id: `s${n}`, targetReps: "5", completed: false, loggedWeight: "", loggedReps: "" })) }] };
    const result = buildWorkoutSession(day, { e: { s1: { completed: true, loggedWeight: "40", loggedReps: "5" } } }, [], "kg", 600,
      { startedAt: "2026-10-08T18:20:00Z", endedAt: "2026-10-08T18:40:00Z", timezone: "Asia/Kolkata" });
    expect(result).toMatchObject({ startedAt: "2026-10-08T18:20:00Z", endedAt: "2026-10-08T18:40:00Z", weightUnit: "kg", timestampQuality: "observed" });
    expect(result?.plannedSetSnapshot).toHaveLength(3);
    expect(result?.exercises[0].sets).toHaveLength(1);
    expect(result?.bodyWeightSnapshot).toBeUndefined();
  });
  it("preserves new metadata through cloud sanitization without inventing legacy units", () => {
    const base = { id: "s", date: "2026-10-09T12:00:00Z", dayId: "d", dayName: "Push", exercises: [{ exerciseId: "e", name: "Press", type: "strength", sets: [{ setId: "s", loggedWeight: "40", loggedReps: "5", targetReps: "5", weightUnit: "lbs" }] }] };
    const payload = sanitizeSyncPayload({ sessions: [{ ...base, weightUnit: "kg", timezone: "Asia/Kolkata", startedAt: "2026-10-09T11:00:00Z", plannedSetSnapshot: [{ exerciseId: "e", setId: "s", targetReps: "5", setType: "working" }] }, base] });
    expect(payload?.sessions?.[0]).toMatchObject({ weightUnit: "kg", startedAt: "2026-10-09T11:00:00Z" });
    expect(payload?.sessions?.[0].plannedSetSnapshot).toHaveLength(1);
    expect(payload?.sessions?.[1].weightUnit).toBeUndefined();
  });
  it("uses the frozen body weight and leaves unknown legacy load unmeasured", () => {
    const session = { id: "s", date: "2026-10-09T12:00:00Z", dayId: "d", dayName: "Pull", exercises: [], weightUnit: "kg" as const, bodyWeightSnapshot: 80 };
    const set = { setId: "s", targetReps: "5", loggedWeight: "BW-20", loggedReps: "5", completed: true };
    expect(resolveSetLoad(set, session)).toMatchObject({ loadKg: 60, loadKind: "bodyweight_assisted", volumeKgReps: 300 });
    expect(resolveSetLoad(set, { ...session, weightUnit: undefined })).toMatchObject({ loadKg: null, volumeKgReps: null });
  });
});
