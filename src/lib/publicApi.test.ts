import { describe, expect, it } from "vitest";
import { mapPublicBodyWeight, mapPublicMe, mapPublicSessions, mapPublicWorkouts, parseApiWindow, type ApiWindow } from "@/lib/publicApi";

const DAY_MS = 86_400_000;
const window: ApiWindow = { since: new Date("2026-10-01T00:00:00Z"), until: new Date("2026-10-09T00:00:00Z") };

describe("API date windows", () => {
  it("defaults to now minus 28 days", () => {
    const now = new Date("2026-10-09T12:34:00Z");
    expect(parseApiWindow(new URLSearchParams(), now)).toEqual({ since: new Date(now.getTime() - 28 * DAY_MS), until: now });
  });
  it("defaults since relative to an explicit until", () => {
    expect(parseApiWindow(new URLSearchParams({ until: "2026-10-09T12:34:00Z" }))).toEqual({ since: new Date("2026-09-11T12:34:00Z"), until: new Date("2026-10-09T12:34:00Z") });
  });
  it("normalizes timezone offsets to UTC and accepts leap days", () => {
    expect(parseApiWindow(new URLSearchParams({ since: "2024-02-29T05:30:00+05:30", until: "2024-03-01T00:00Z" }))).toEqual({ since: new Date("2024-02-29T00:00:00Z"), until: new Date("2024-03-01T00:00:00Z") });
  });
  it.each(["", "bad", "2026-10-08", "2026-10-08T12:00:00", "2026-02-29T00:00:00Z", "2026-02-30T00:00:00Z", "2026-13-01T00:00:00Z", "2026-10-08T25:00:00Z", "2026-10-08T00:60:00Z", "2026-10-08T00:00:99Z", "2026-10-08T00:00:00+25:00"])("rejects invalid instants: %s", (value) => {
    expect(parseApiWindow(new URLSearchParams({ since: value, until: "2026-10-09T00:00:00Z" }))).toHaveProperty("error");
    expect(parseApiWindow(new URLSearchParams({ until: value }))).toHaveProperty("error");
  });
  it.each(["2026-10-09T00:00:00Z", "2026-10-10T00:00:00Z"])("rejects since >= until", (since) => {
    expect(parseApiWindow(new URLSearchParams({ since, until: "2026-10-09T00:00:00Z" }))).toHaveProperty("error");
  });
  it("accepts exactly 400 days and rejects an extra millisecond", () => {
    const until = new Date("2026-10-09T00:00:00Z");
    const since = new Date(until.getTime() - 400 * DAY_MS);
    expect(parseApiWindow(new URLSearchParams({ since: since.toISOString(), until: until.toISOString() }))).toEqual({ since, until });
    expect(parseApiWindow(new URLSearchParams({ since: new Date(since.getTime() - 1).toISOString(), until: until.toISOString() }))).toHaveProperty("error");
  });
});

describe("public session mapping", () => {
  const session = {
    id: "abc", date: "2026-10-08T11:42:00+05:30", dayId: "private-day", dayName: "Push A", duration: 3479, totalTonnage: 6240,
    notes: "private", bodyWeightSnapshot: 72.4,
    exercises: [{ exerciseId: "private-exercise", name: "Bench Press", type: "strength", sets: [
      { completed: true, loggedWeight: " 80.5 ", loggedReps: "6", rpe: 9 },
      { completed: true, loggedWeight: "80.5", loggedReps: "8" },
      { completed: true, loggedWeight: "75", loggedReps: "12" },
      { completed: true, loggedWeight: "90", loggedReps: "bad" },
      { completed: false, loggedWeight: "200", loggedReps: "10" },
      { loggedWeight: "300", loggedReps: "10" },
      { completed: "true", loggedWeight: "400", loggedReps: "10" },
    ] }],
  };
  it("counts only completed === true, selects the heaviest parsed set and breaks ties by reps", () => {
    expect(mapPublicSessions([session], window)).toEqual([{
      id: "abc", startedAt: "2026-10-08T06:12:00.000Z", dayName: "Push A", durationMinutes: 58,
      exerciseCount: 1, completedSets: 4, totalSets: 7, totalTonnage: 6240,
      exercises: [{ name: "Bench Press", type: "strength", completedSets: 4, totalSets: 7, topSet: { weight: 80.5, reps: 8 } }],
    }]);
  });
  it("returns null for missing duration, tonnage, and unparseable top sets", () => {
    const mapped = mapPublicSessions([{ ...session, duration: undefined, totalTonnage: undefined, exercises: [{ name: "Cardio", type: "other", sets: [{ completed: true, loggedWeight: "", loggedReps: "" }] }] }], window)[0];
    expect(mapped.durationMinutes).toBeNull();
    expect(mapped.totalTonnage).toBeNull();
    expect(mapped.exercises[0].topSet).toBeNull();
  });
  it.each(["", " ", "NaN", "Infinity", "80kg", "0x50", "80-90"])("does not turn invalid numeric logs into a top set: %s", (weight) => {
    const mapped = mapPublicSessions([{ ...session, exercises: [{ name: "Bench", type: "strength", sets: [{ completed: true, loggedWeight: weight, loggedReps: "6" }] }] }], window)[0];
    expect(mapped.exercises[0].topSet).toBeNull();
  });
  it("preserves zero-valued weights, duration, and stored tonnage", () => {
    const mapped = mapPublicSessions([{ ...session, duration: 0, totalTonnage: 0, exercises: [{ name: "Bodyweight", type: "hypertrophy", sets: [{ completed: true, loggedWeight: "0", loggedReps: "10" }] }] }], window)[0];
    expect(mapped.durationMinutes).toBe(0);
    expect(mapped.totalTonnage).toBe(0);
    expect(mapped.exercises[0].topSet).toEqual({ weight: 0, reps: 10 });
  });
  it("skips invalid dates, includes since, excludes until, and sorts by parsed instant", () => {
    const sessions = [
      { ...session, id: "middle" }, { ...session, id: "invalid", date: "not-a-date" },
      { ...session, id: "until", date: window.until.toISOString() },
      { ...session, id: "before", date: new Date(window.since.getTime() - 1).toISOString() },
      { ...session, id: "since", date: window.since.toISOString() },
    ];
    expect(mapPublicSessions(sessions, window).map((session) => session.id)).toEqual(["since", "middle"]);
  });
  it("sorts before capping the earliest 1000 sessions and leaves input untouched", () => {
    const input = Array.from({ length: 1002 }, (_, index) => ({ ...session, id: String(index), date: new Date(window.since.getTime() + index * 1000).toISOString() })).reverse();
    const mapped = mapPublicSessions(input, window);
    expect(mapped).toHaveLength(1000);
    expect(mapped[0].id).toBe("0");
    expect(mapped[999].id).toBe("999");
    expect(input[0].id).toBe("1001");
  });
});

describe("body weight date windows", () => {
  it("uses UTC date keys with inclusive since and exclusive until, and only exposes date/weight", () => {
    const offsetWindow = { since: new Date("2026-10-02T01:00:00+05:30"), until: new Date("2026-10-09T01:00:00+05:30") };
    expect(mapPublicBodyWeight([
      { date: "2026-10-07", weight: 72.4, notes: "private" }, { date: "2026-10-01", weight: 73 },
      { date: "2026-09-30", weight: 74 }, { date: "2026-10-08", weight: 72 },
      { date: "bad", weight: 70 }, { date: "2026-10-03", weight: NaN },
    ], offsetWindow)).toEqual([{ date: "2026-10-01", weight: 73 }, { date: "2026-10-07", weight: 72.4 }]);
  });
  it("returns no body weight for a window within one UTC date", () => {
    expect(mapPublicBodyWeight([{ date: "2026-10-08", weight: 72.4 }], { since: new Date("2026-10-08T00:01:00Z"), until: new Date("2026-10-08T23:59:00Z") })).toEqual([]);
  });
});

describe("public response privacy and defaults", () => {
  it("returns the me contract without ids or email, favoring the synced weight unit", () => {
    const user = { name: "Alex", weightUnit: "kg", email: "private@example.com", _id: "private" };
    expect(mapPublicMe(user, { sessions: [{}, {}], settings: { weightUnit: "lbs" }, lastSyncedAt: "2026-10-08T06:12:00Z" })).toEqual({ schemaVersion: 1, user: { name: "Alex" }, weightUnit: "lbs", lastSyncedAt: "2026-10-08T06:12:00.000Z", sessionCount: 2 });
  });
  it("supports an account with no sync data", () => {
    expect(mapPublicMe({ name: null, weightUnit: "lbs" }, null)).toEqual({ schemaVersion: 1, user: { name: null }, weightUnit: "lbs", lastSyncedAt: null, sessionCount: 0 });
    expect(mapPublicWorkouts(null, "kg", window)).toEqual({ schemaVersion: 1, weightUnit: "kg", since: window.since.toISOString(), until: window.until.toISOString(), sessions: [], bodyWeight: [] });
  });
});
