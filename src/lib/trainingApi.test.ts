import { describe, expect, it } from "vitest";
import { computeAllTimePRs } from "@/services/workoutService";
import type { DayRoutine, WorkoutSession } from "@/types";
import { accountKey, buildBodyWeightPage, buildTrainingSummary, parseTrainingWindow, TrainingApiError } from "./trainingApi";

const session = (id: string, date: string, weight = "40"): WorkoutSession => ({ id, date, dayId: "d", dayName: "Push", weightUnit: "kg", updatedAt: date, exercises: [{ exerciseId: "e", name: "Press", type: "strength", sets: [{ setId: "s", targetReps: "5", loggedWeight: weight, loggedReps: "5", completed: true }] }] });

describe("shared training eligibility", () => {
  it("ignores uncompleted, warmup and invalid sets for PRs", () => {
    const saved = session("s", "2026-10-09T12:00:00Z");
    saved.exercises[0].sets.push(
      { setId: "draft", targetReps: "5", loggedWeight: "999", loggedReps: "5", completed: false },
      { setId: "warmup", targetReps: "5", loggedWeight: "888", loggedReps: "5", completed: true, setType: "warmup" },
      { setId: "invalid", targetReps: "5", loggedWeight: "777", loggedReps: "5oops", completed: true },
    );
    const day: DayRoutine = { id: "d", dayNumber: 1, title: "Push", name: "Push", exercises: [{ id: "e", name: "Press", type: "strength", sets: [] }] };
    expect(computeAllTimePRs([day], [saved], [], "kg").e).toBe(40);
  });
});

const window = (query = "from=2026-10-05&to=2026-10-11&timezone=Asia/Kolkata&limit=1") => parseTrainingWindow(new URLSearchParams(query), "UTC");
describe("v2 training contract", () => {
  it("uses full eligible history for PR baselines and aggregates across all pages", () => {
    const data = { revision: 7, sessions: [session("old", "2026-10-01T12:00:00Z", "30"), session("a", "2026-10-05T12:00:00Z"), session("b", "2026-10-06T12:00:00Z", "50")] };
    const first = buildTrainingSummary(data, "owner", window());
    expect(first.sessions.map(s => s.id)).toEqual(["a"]);
    expect(first.weeklyTrainingLoad[0]).toMatchObject({ sessionCount: 2, attendedSessions: 2, volumeKgReps: 450, completeWeek: true });
    expect(first.personalRecords.find(r => r.metric === "max_load")).toMatchObject({ value: 40, previousValue: 30, exerciseId: "e" });
    expect(first.page).toMatchObject({ total: 2, returned: 1, hasMore: true });
    const nextWindow = { ...window(), cursor: first.page.nextCursor };
    const second = buildTrainingSummary(data, "owner", nextWindow);
    expect(second.sessions.map(s => s.id)).toEqual(["b"]);
    expect(second.personalRecords.find(r => r.metric === "max_load")).toMatchObject({ value: 50, previousValue: 40 });
    expect(second.weeklyTrainingLoad).toEqual(first.weeklyTrainingLoad);
    expect(second.page.hasMore).toBe(false);
    for (const [owner, changed, resource] of [["other", data, "training/summary"], ["owner", { ...data, revision: 8 }, "training/summary"], ["owner", data, "sessions"]] as const) {
      expect(() => buildTrainingSummary(changed, owner, nextWindow, resource)).toThrow(TrainingApiError);
    }
  });
  it("keeps zero-completion sessions explicit and legacy units unknown", () => {
    const draft = session("draft", "2026-10-05T12:00:00Z", "999");
    draft.exercises[0].sets[0].completed = false;
    const legacy = { ...session("legacy", "2026-10-06T12:00:00Z"), weightUnit: undefined };
    const summary = buildTrainingSummary({ sessions: [draft, legacy] }, "owner", { ...window(), limit: 20 });
    expect(summary.sessions[0].completionQuality).toMatchObject({ attendanceEligible: false, completedSets: 0, plannedWorkingSets: null });
    expect(summary.sessions[1]).toMatchObject({ volumeKgReps: null, startedAt: null, timestampQuality: "recorded_only" });
    expect(summary.weeklyTrainingLoad[0]).toMatchObject({ volumeKgReps: null, knownVolumeKgReps: 0 });
    expect(summary.coverage).toMatchObject({ unknownLoadSessions: 1, unknownPlanSessions: 2, observationCoverage: "unknown" });
    expect(summary.adherence.status).toBe("unconfigured");
  });
  it("uses the saved plan denominator while separating extras and warmups", () => {
    const saved = session("planned", "2026-10-09T12:00:00Z");
    saved.plannedSetSnapshot = ["s", "unrecorded-1", "unrecorded-2"].map(setId => ({ exerciseId: "e", setId, targetReps: "5", setType: "working" }));
    saved.exercises[0].sets.push(
      { setId: "extra", targetReps: "5", loggedWeight: "20", loggedReps: "5", completed: true, isExtra: true },
      { setId: "warmup", targetReps: "5", loggedWeight: "10", loggedReps: "5", completed: true, setType: "warmup" },
    );
    const result = buildTrainingSummary({ sessions: [saved] }, "owner", window());
    expect(result.sessions[0].completionQuality).toMatchObject({ plannedWorkingSets: 3, completedPlannedSets: 1,
      completedWorkingSets: 2, completedWarmupSets: 1, plannedCompletionRatio: 1/3 });
    expect(result.sessions[0].volumeKgReps).toBe(300);
    expect(result.adherence.status).toBe("unconfigured");
  });
  it("buckets observed sessions by start and labels date-only imports", () => {
    const crossing = { ...session("a", "2026-10-09T19:00:00Z"), startedAt: "2026-10-09T18:20:00Z", endedAt: "2026-10-09T19:00:00Z" };
    const imported = { ...session("b", "2026-10-09T00:00:00Z"), localDate: "2026-10-09", timestampQuality: "date_only" as const };
    const summary = buildTrainingSummary({ sessions: [crossing, imported] }, "owner", window("from=2026-10-09&to=2026-10-09&timezone=Asia/Kolkata"));
    expect(summary.sessions.map(s => s.date)).toEqual(["2026-10-09", "2026-10-09"]);
    expect(summary.sessions.find(s => s.id === "b")?.timestampQuality).toBe("date_only");
    expect(summary.coverage.dateOnlySessions).toBe(1);
  });
  it("provides independent inclusive weight dates and canonical units", () => {
    const result = buildBodyWeightPage({ revision: 3, bodyWeightEntries: [{ date: "2026-10-03", weight: 176.3698097479, weightUnit: "lbs" }, { date: "2026-10-09", weight: 80 }] }, "owner", window("from=2026-10-03&to=2026-10-09&timezone=Asia/Kolkata"));
    expect(result.items.map(e => e.date)).toEqual(["2026-10-03", "2026-10-09"]);
    expect(result.items[0].kilograms).toBe(80);
    expect(result.items[1].kilograms).toBeNull();
    expect(result.coverage.unknownUnitEntries).toBe(1);
  });
  it("bounds detail without truncating aggregate totals", () => {
    const saved = session("dense", "2026-10-09T12:00:00Z");
    saved.exercises[0].sets = Array.from({ length: 600 }, (_, i) => ({ setId: `set-${i}`, targetReps: "5", loggedWeight: "40", loggedReps: "5", completed: true }));
    const result = buildTrainingSummary({ sessions: [saved] }, "owner", { ...window(), limit: 20 });
    expect(result.sessions[0].exercises[0].sets).toHaveLength(500);
    expect(result.sessions[0].volumeKgReps).toBe(120_000);
    expect(result.coverage.detailTruncatedSessionIds).toEqual(["dense"]);
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(2_000_000);
  });
  it("reduces a dense page to its byte budget and resumes without skipping rows", () => {
    const sessions = Array.from({ length: 20 }, (_, n) => {
      const saved = session(`dense-${String(n).padStart(2, "0")}`, "2026-10-09T12:00:00Z");
      saved.exercises[0].sets = Array.from({ length: 500 }, (_, i) => ({ setId: `set-${i}-${"x".repeat(150)}`, targetReps: "5".repeat(128), loggedWeight: "40", loggedReps: "5", completed: true }));
      return saved;
    });
    const query = { ...window(), limit: 50 };
    const first = buildTrainingSummary({ sessions, revision: 5 }, "owner", query);
    expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(2_000_000);
    expect(first.page.returned).toBeLessThan(20);
    expect(first.page.hasMore).toBe(true);
    expect(first.weeklyTrainingLoad[0].sessionCount).toBe(20);
    const second = buildTrainingSummary({ sessions, revision: 5 }, "owner", { ...query, cursor: first.page.nextCursor });
    expect(second.sessions[0].id).toBe(sessions[first.page.returned].id);
    expect(second.weeklyTrainingLoad).toEqual(first.weeklyTrainingLoad);
  });
  it.each(["from=2026-02-30", "from=2026-10-11&to=2026-10-10", "timezone=bad", "limit=51", "limit=-1", "from=2024-01-01&to=2026-01-01"])("rejects invalid query %s", query => {
    expect(() => parseTrainingWindow(new URLSearchParams(query), "UTC", new Date("2026-10-10T00:00Z"))).toThrow(TrainingApiError);
  });
  it("uses calendar-day bounds at a DST transition and stable opaque account identity", () => {
    const result = buildTrainingSummary({ sessions: [session("a", "2026-11-01T05:30:00Z"), session("b", "2026-11-01T06:30:00Z")] }, "owner", window("from=2026-11-01&to=2026-11-01&timezone=America/New_York"));
    expect(result.sessions.map(s => s.date)).toEqual(["2026-11-01", "2026-11-01"]);
    expect(accountKey("owner")).toBe(accountKey("owner"));
    expect(accountKey("owner")).not.toBe(accountKey("other"));
  });
});
