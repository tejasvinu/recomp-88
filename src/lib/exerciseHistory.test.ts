import { describe, expect, it } from "vitest";
import {
  calculateEpley1Rm,
  computeProgressionHint,
  detectRepPRs,
  extractExerciseSessionHistory,
  findPlannedRepRange,
  parseRepRange,
} from "./exerciseHistory";
import type { WorkoutSession } from "@/types";

describe("exerciseHistory domain math", () => {
  describe("parseRepRange", () => {
    it("parses valid ranges and single targets", () => {
      expect(parseRepRange("8-12")).toEqual({ min: 8, max: 12 });
      expect(parseRepRange("8–12")).toEqual({ min: 8, max: 12 }); // en-dash
      expect(parseRepRange("8—12")).toEqual({ min: 8, max: 12 }); // em-dash
      expect(parseRepRange(" 6 - 8 ")).toEqual({ min: 6, max: 8 });
      expect(parseRepRange("5")).toEqual({ min: 5, max: 5 });
      expect(parseRepRange("10")).toEqual({ min: 10, max: 10 });
    });

    it("returns null for invalid or unparseable ranges", () => {
      expect(parseRepRange("")).toBeNull();
      expect(parseRepRange(null)).toBeNull();
      expect(parseRepRange(undefined)).toBeNull();
      expect(parseRepRange("cardio")).toBeNull();
      expect(parseRepRange("8-")).toBeNull();
      expect(parseRepRange("-5")).toBeNull();
      expect(parseRepRange("12-8")).toBeNull(); // min > max
      expect(parseRepRange("0")).toBeNull();
    });

    it("finds planned rep range from exercise sets", () => {
      expect(findPlannedRepRange({ sets: [{ targetReps: "8-12" }] })).toEqual({ min: 8, max: 12 });
      expect(findPlannedRepRange({ sets: [] })).toBeNull();
      expect(findPlannedRepRange(null)).toBeNull();
    });
  });

  describe("calculateEpley1Rm", () => {
    it("calculates Epley 1RM strictly for reps <= 12", () => {
      // 100 * (1 + 10 / 30) = 133.333
      expect(calculateEpley1Rm(100, 10)).toBe(133.333);
      // 60 * (1 + 12 / 30) = 84
      expect(calculateEpley1Rm(60, 12)).toBe(84);
      // 100 * (1 + 1 / 30) = 103.333
      expect(calculateEpley1Rm(100, 1)).toBe(103.333);
    });

    it("returns null for reps > 12", () => {
      expect(calculateEpley1Rm(100, 13)).toBeNull();
      expect(calculateEpley1Rm(60, 15)).toBeNull();
      expect(calculateEpley1Rm(40, 20)).toBeNull();
    });

    it("returns null for invalid reps or weights", () => {
      expect(calculateEpley1Rm(0, 10)).toBeNull();
      expect(calculateEpley1Rm(-50, 10)).toBeNull();
      expect(calculateEpley1Rm(100, 0)).toBeNull();
      expect(calculateEpley1Rm(100, -2)).toBeNull();
      expect(calculateEpley1Rm(Number.NaN, 5)).toBeNull();
    });
  });

  describe("extractExerciseSessionHistory", () => {
    const baseSession: WorkoutSession = {
      id: "session-1",
      date: "2026-10-01T10:00:00.000Z",
      dayId: "push-1",
      dayName: "Push",
      weightUnit: "kg",
      exercises: [],
    };

    it("excludes warmups and unmeasured sets from top set, volume, and e1RM", () => {
      const session: WorkoutSession = {
        ...baseSession,
        exercises: [
          {
            exerciseId: "bench-press",
            name: "Barbell Bench Press",
            type: "strength",
            sets: [
              {
                setId: "s1",
                targetReps: "8-12",
                loggedWeight: "40",
                loggedReps: "10",
                completed: true,
                setType: "warmup",
              },
              {
                setId: "s2",
                targetReps: "8-12",
                loggedWeight: "80",
                loggedReps: "8",
                completed: true,
                setType: "working",
              },
              {
                setId: "s3",
                targetReps: "8-12",
                loggedWeight: "invalid",
                loggedReps: "8",
                completed: true,
                setType: "working",
              },
              {
                setId: "s4",
                targetReps: "8-12",
                loggedWeight: "70",
                loggedReps: "0", // 0 reps = unmeasured
                completed: true,
                setType: "working",
              },
              {
                setId: "s5",
                targetReps: "8-12",
                loggedWeight: "90",
                loggedReps: "5",
                completed: false, // uncompleted
                setType: "working",
              },
            ],
          },
        ],
      };

      const history = extractExerciseSessionHistory([session], "bench-press");
      expect(history).toHaveLength(1);
      const item = history[0];

      expect(item.completedWorkingSets).toBe(3); // s2, s3, s4 completed working sets
      expect(item.completedWarmupSets).toBe(1); // s1
      expect(item.unmeasuredWorkingSets).toBe(2); // s3, s4
      expect(item.topSet).toEqual({
        setId: "s2",
        reps: 8,
        loadKg: 80,
        loadKind: "external",
        sourceWeight: 80,
        sourceUnit: "kg",
      });
      expect(item.knownWorkingVolumeKgReps).toBe(640); // 80 * 8
      expect(item.totalWorkingVolumeKgReps).toBeNull(); // null because unmeasuredWorkingSets > 0
      expect(item.estimated1RmKg).toBe(101.333); // 80 * (1 + 8 / 30) = 101.333
      expect(item.isEstimate).toBe(true);
      expect(item.estimateMethod).toBe("epley_cap12");
    });

    it("respects stored units (lbs converted to kg) and leaves null units unknown", () => {
      const sessionLbs: WorkoutSession = {
        ...baseSession,
        id: "session-lbs",
        weightUnit: "lbs",
        exercises: [
          {
            exerciseId: "bench-press",
            name: "Bench Press",
            type: "strength",
            sets: [
              {
                setId: "s1",
                targetReps: "5",
                loggedWeight: "100",
                loggedReps: "5",
                completed: true,
                setType: "working",
                weightUnit: "lbs",
              },
            ],
          },
        ],
      };

      const historyLbs = extractExerciseSessionHistory([sessionLbs], "bench-press");
      expect(historyLbs[0].topSet?.loadKg).toBe(45.359); // 100 lbs * 0.45359237 rounded
      expect(historyLbs[0].topSet?.sourceWeight).toBe(100);
      expect(historyLbs[0].topSet?.sourceUnit).toBe("lbs");

      const sessionNullUnit: WorkoutSession = {
        ...baseSession,
        id: "session-null",
        weightUnit: undefined,
        exercises: [
          {
            exerciseId: "bench-press",
            name: "Bench Press",
            type: "strength",
            sets: [
              {
                setId: "s1",
                targetReps: "5",
                loggedWeight: "100",
                loggedReps: "5",
                completed: true,
                setType: "working",
                weightUnit: undefined,
              },
            ],
          },
        ],
      };

      const historyNull = extractExerciseSessionHistory([sessionNullUnit], "bench-press");
      expect(historyNull[0].unmeasuredWorkingSets).toBe(1);
      expect(historyNull[0].topSet).toBeNull();
      expect(historyNull[0].knownWorkingVolumeKgReps).toBe(0);
      expect(historyNull[0].totalWorkingVolumeKgReps).toBeNull();
      expect(historyNull[0].estimated1RmKg).toBeNull();
    });
  });

  describe("detectRepPRs", () => {
    it("detects rep PRs per weight across session history", () => {
      const sessions: WorkoutSession[] = [
        {
          id: "s1",
          date: "2026-10-01T10:00:00.000Z",
          dayId: "push",
          dayName: "Push",
          weightUnit: "kg",
          exercises: [
            {
              exerciseId: "bench-press",
              name: "Bench Press",
              type: "strength",
              sets: [
                { setId: "set1", targetReps: "8-12", loggedWeight: "60", loggedReps: "8", completed: true, setType: "working" },
              ],
            },
          ],
        },
        {
          id: "s2",
          date: "2026-10-03T10:00:00.000Z",
          dayId: "push",
          dayName: "Push",
          weightUnit: "kg",
          exercises: [
            {
              exerciseId: "bench-press",
              name: "Bench Press",
              type: "strength",
              sets: [
                { setId: "set2", targetReps: "8-12", loggedWeight: "60", loggedReps: "10", completed: true, setType: "working" },
              ],
            },
          ],
        },
        {
          id: "s3",
          date: "2026-10-05T10:00:00.000Z",
          dayId: "push",
          dayName: "Push",
          weightUnit: "kg",
          exercises: [
            {
              exerciseId: "bench-press",
              name: "Bench Press",
              type: "strength",
              sets: [
                { setId: "set3", targetReps: "8-12", loggedWeight: "60", loggedReps: "9", completed: true, setType: "working" }, // Not a PR (10 > 9)
                { setId: "set4", targetReps: "5", loggedWeight: "70", loggedReps: "5", completed: true, setType: "working" }, // PR at 70kg
              ],
            },
          ],
        },
        {
          id: "s4",
          date: "2026-10-07T10:00:00.000Z",
          dayId: "push",
          dayName: "Push",
          weightUnit: "kg",
          exercises: [
            {
              exerciseId: "bench-press",
              name: "Bench Press",
              type: "strength",
              sets: [
                { setId: "set5", targetReps: "8-12", loggedWeight: "60", loggedReps: "12", completed: true, setType: "working" }, // PR at 60kg (12 > 10)
              ],
            },
          ],
        },
      ];

      const { prs, allTimeBest } = detectRepPRs(sessions, "bench-press");

      // PR sequence:
      // 1. 60 kg x 8 (baseline, previousReps = null)
      // 2. 60 kg x 10 (previousReps = 8)
      // 3. 70 kg x 5 (baseline, previousReps = null)
      // 4. 60 kg x 12 (previousReps = 10)
      expect(prs).toHaveLength(4);

      expect(prs[0]).toMatchObject({ loadKg: 60, reps: 8, previousReps: null, sessionId: "s1" });
      expect(prs[1]).toMatchObject({ loadKg: 60, reps: 10, previousReps: 8, sessionId: "s2" });
      expect(prs[2]).toMatchObject({ loadKg: 70, reps: 5, previousReps: null, sessionId: "s3" });
      expect(prs[3]).toMatchObject({ loadKg: 60, reps: 12, previousReps: 10, sessionId: "s4" });

      // allTimeBest sorted by weight descending
      expect(allTimeBest).toEqual([
        { loadKg: 70, reps: 5, sourceWeight: 70, sourceUnit: "kg", sessionId: "s3", achievedAt: "2026-10-05T10:00:00.000Z" },
        { loadKg: 60, reps: 12, sourceWeight: 60, sourceUnit: "kg", sessionId: "s4", achievedAt: "2026-10-07T10:00:00.000Z" },
      ]);
    });
  });

  describe("computeProgressionHint", () => {
    const plannedRepRange = { min: 8, max: 12 };

    const makeSessionSummary = (sessionId: string, weight: number, reps: number, unit: "kg" | "lbs" = "kg") => ({
      sessionId,
      dayId: "push",
      dayName: "Push",
      date: "2026-10-01",
      startedAt: "2026-10-01T10:00:00.000Z",
      timestampQuality: "observed" as const,
      completedWorkingSets: 1,
      completedWarmupSets: 0,
      unmeasuredWorkingSets: 0,
      topSet: {
        setId: "set-1",
        reps,
        loadKg: weight,
        loadKind: "external",
        sourceWeight: weight,
        sourceUnit: unit,
      },
      knownWorkingVolumeKgReps: weight * reps,
      totalWorkingVolumeKgReps: weight * reps,
      estimated1RmKg: calculateEpley1Rm(weight, reps),
      estimateMethod: "epley_cap12" as const,
      isEstimate: true as const,
    });

    it("returns progression hint when last 3 sessions hit top of rep range at same weight", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
        makeSessionSummary("s3", 60, 12, "kg"),
      ];

      const hint = computeProgressionHint({ history, plannedRepRange });
      expect(hint).toBe("last 3 sessions hit the top of the rep range at 60 kg → try 62.5 kg");
    });

    it("supports weightUnit lbs with +5 lbs increment", () => {
      const history = [
        makeSessionSummary("s1", 135, 12, "lbs"),
        makeSessionSummary("s2", 135, 12, "lbs"),
        makeSessionSummary("s3", 135, 12, "lbs"),
      ];

      const hint = computeProgressionHint({ history, plannedRepRange, weightUnit: "lbs" });
      expect(hint).toBe("last 3 sessions hit the top of the rep range at 135 lbs → try 140 lbs");
    });

    it("returns null when there are fewer than minSessions (not enough data)", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
      ];

      expect(computeProgressionHint({ history, plannedRepRange })).toBeNull();
    });

    it("respects custom minSessions threshold", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
      ];

      expect(computeProgressionHint({ history, plannedRepRange, minSessions: 2 })).toBe(
        "last 2 sessions hit the top of the rep range at 60 kg → try 62.5 kg"
      );
    });

    it("returns null when any of the last 3 sessions did not hit the top of rep range", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 11, "kg"), // Only 11 reps (< 12)
        makeSessionSummary("s3", 60, 12, "kg"),
      ];

      expect(computeProgressionHint({ history, plannedRepRange })).toBeNull();
    });

    it("returns null when weights differed across the sessions", () => {
      const history = [
        makeSessionSummary("s1", 57.5, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
        makeSessionSummary("s3", 60, 12, "kg"),
      ];

      expect(computeProgressionHint({ history, plannedRepRange })).toBeNull();
    });

    it("returns null when no planned rep range exists", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
        makeSessionSummary("s3", 60, 12, "kg"),
      ];

      expect(computeProgressionHint({ history, plannedRepRange: null })).toBeNull();
    });

    it("returns null when unit is null/unknown", () => {
      const history = [
        makeSessionSummary("s1", 60, 12, "kg"),
        makeSessionSummary("s2", 60, 12, "kg"),
        {
          ...makeSessionSummary("s3", 60, 12, "kg"),
          topSet: {
            setId: "set-1",
            reps: 12,
            loadKg: null,
            loadKind: "external",
            sourceWeight: 60,
            sourceUnit: null,
          },
        },
      ];

      expect(computeProgressionHint({ history, plannedRepRange })).toBeNull();
    });
  });
});
