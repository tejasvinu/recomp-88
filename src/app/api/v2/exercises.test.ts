import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getExercises } from "./exercises/route";
import { GET as getExerciseHistory } from "./exercises/[id]/history/route";
import { GET as getMe } from "./me/route";
import { apiJson } from "@/lib/apiResponse";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  user: vi.fn(),
  data: vi.fn(),
}));

vi.mock("@/lib/apiTokens", () => ({ authenticateApiToken: mocks.authenticate }));
vi.mock("@/models/User", () => ({ default: { findById: mocks.user } }));
vi.mock("@/models/UserData", () => ({ default: { findOne: mocks.data } }));

describe("v2 exercise list and history routes", () => {
  const sampleWorkoutTemplate = [
    {
      id: "push-day",
      dayNumber: 1,
      title: "Push",
      name: "Push",
      exercises: [
        {
          id: "bench-press",
          name: "Barbell Bench Press",
          type: "strength",
          sets: [
            { id: "set-1", targetReps: "8-12", completed: false, loggedWeight: "", loggedReps: "" },
            { id: "set-2", targetReps: "8-12", completed: false, loggedWeight: "", loggedReps: "" },
          ],
        },
        {
          id: "overhead-press",
          name: "Overhead Press",
          type: "strength",
          sets: [{ id: "set-1", targetReps: "6-8", completed: false, loggedWeight: "", loggedReps: "" }],
        },
      ],
    },
  ];

  const sampleSessions = [
    {
      id: "session-1",
      date: "2026-10-01T18:00:00.000Z",
      dayId: "push-day",
      dayName: "Push",
      weightUnit: "kg",
      exercises: [
        {
          exerciseId: "bench-press",
          name: "Barbell Bench Press",
          type: "strength",
          sets: [
            { setId: "s1", targetReps: "8-12", loggedWeight: "60", loggedReps: "12", completed: true, setType: "working" },
          ],
        },
      ],
    },
    {
      id: "session-2",
      date: "2026-10-04T18:00:00.000Z",
      dayId: "push-day",
      dayName: "Push",
      weightUnit: "kg",
      exercises: [
        {
          exerciseId: "bench-press",
          name: "Barbell Bench Press",
          type: "strength",
          sets: [
            { setId: "s1", targetReps: "8-12", loggedWeight: "60", loggedReps: "12", completed: true, setType: "working" },
          ],
        },
      ],
    },
    {
      id: "session-3",
      date: "2026-10-07T18:00:00.000Z",
      dayId: "push-day",
      dayName: "Push",
      weightUnit: "kg",
      exercises: [
        {
          exerciseId: "bench-press",
          name: "Barbell Bench Press",
          type: "strength",
          sets: [
            { setId: "s1", targetReps: "8-12", loggedWeight: "60", loggedReps: "12", completed: true, setType: "working" },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticate.mockResolvedValue({ userId: "owner-123" });
    mocks.user.mockReturnValue({ select: () => ({ lean: async () => ({ name: "Owner Name" }) }) });
    mocks.data.mockReturnValue({
      select: () => ({
        lean: async () => ({
          revision: 5,
          sessions: sampleSessions,
          workoutTemplate: sampleWorkoutTemplate,
          customExercises: [],
          bodyWeightEntries: [],
          settings: { timezone: "Asia/Kolkata" },
          lastSyncedAt: new Date("2026-10-09T18:00:00.000Z"),
          exerciseNotes: { private: "never expose" },
        }),
      }),
    });
  });

  describe("GET /api/v2/me capabilities", () => {
    it("advertises exercise capabilities in /api/v2/me", async () => {
      const res = await getMe(new Request("http://localhost/api/v2/me"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.capabilities).toContain("exercise-history-v2");
      expect(json.capabilities).toContain("exercise-list-v2");
    });
  });

  describe("GET /api/v2/exercises", () => {
    it("requires read:workouts authentication", async () => {
      mocks.authenticate.mockResolvedValue(apiJson({ error: "Unauthorized" }, 401));
      const res = await getExercises(new Request("http://localhost/api/v2/exercises"));
      expect(res.status).toBe(401);
    });

    it("returns owner exercises with last-performed date and planned rep range", async () => {
      const res = await getExercises(new Request("http://localhost/api/v2/exercises"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      const json = await res.json();

      expect(json).toMatchObject({
        schemaVersion: 2,
        revision: 5,
        timezone: expect.stringMatching(/^Asia\/(Calcutta|Kolkata)$/),
        total: 2,
      });

      expect(JSON.stringify(json)).not.toContain("never expose");

      const bench = json.exercises.find((e: { id: string }) => e.id === "bench-press");
      expect(bench).toMatchObject({
        id: "bench-press",
        name: "Barbell Bench Press",
        type: "strength",
        plannedRepRange: "8-12",
        totalSessions: 3,
        lastPerformedDate: "2026-10-07",
      });

      const ohp = json.exercises.find((e: { id: string }) => e.id === "overhead-press");
      expect(ohp).toMatchObject({
        id: "overhead-press",
        name: "Overhead Press",
        type: "strength",
        plannedRepRange: "6-8",
        totalSessions: 0,
        lastPerformedDate: null,
      });
    });
  });

  describe("GET /api/v2/exercises/{id}/history", () => {
    it("returns 404 for unknown exercise id", async () => {
      const res = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/unknown-lift/history"),
        { params: Promise.resolve({ id: "unknown-lift" }) }
      );
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("exercise_not_found");
    });

    it("validates date and timezone parameters", async () => {
      const res = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/bench-press/history?from=invalid-date"),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("invalid_date");
    });

    it("returns paginated history, PRs, progression hint, and coverage ledger", async () => {
      const res = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/bench-press/history?from=2026-10-01&to=2026-10-08&limit=2"),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json).toMatchObject({
        schemaVersion: 2,
        accountKey: expect.stringMatching(/^rcpa_/),
        revision: 5,
        exercise: {
          id: "bench-press",
          name: "Barbell Bench Press",
          type: "strength",
          plannedRepRange: "8-12",
        },
        massUnit: "kg",
        volumeUnit: "kg_reps",
        progressionHint: "last 3 sessions hit the top of the rep range at 60 kg → try 62.5 kg",
        page: {
          limit: 2,
          returned: 2,
          total: 3,
          hasMore: true,
          nextCursor: expect.any(String),
        },
        coverage: {
          scope: "cloud_ledger_only",
          observationCoverage: "unknown",
          aggregatesIncludeAllMatchingSessions: true,
          personalRecordBaseline: "eligible_cloud_history",
          detailPageComplete: false,
        },
      });

      expect(json.history).toHaveLength(2);
      expect(json.history[0]).toMatchObject({
        sessionId: "session-1",
        completedWorkingSets: 1,
        topSet: {
          reps: 12,
          loadKg: 60,
          sourceWeight: 60,
          sourceUnit: "kg",
        },
        totalWorkingVolumeKgReps: 720,
        estimated1RmKg: 84,
        isEstimate: true,
        estimateMethod: "epley_cap12",
      });

      // Now fetch page 2 using nextCursor
      const nextCursor = json.page.nextCursor;
      const res2 = await getExerciseHistory(
        new Request(`http://localhost/api/v2/exercises/bench-press/history?from=2026-10-01&to=2026-10-08&limit=2&cursor=${encodeURIComponent(nextCursor)}`),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.page).toMatchObject({
        returned: 1,
        total: 3,
        hasMore: false,
        nextCursor: null,
      });
      expect(json2.history).toHaveLength(1);
      expect(json2.history[0].sessionId).toBe("session-3");
    });

    it("returns 409 cursor_changed when cursor binding does not match", async () => {
      // Fetch page 1
      const res1 = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/bench-press/history?from=2026-10-01&to=2026-10-08&limit=1"),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      const cursor = (await res1.json()).page.nextCursor;

      // Pass cursor to a different date window
      const resConflict = await getExerciseHistory(
        new Request(`http://localhost/api/v2/exercises/bench-press/history?from=2026-10-02&to=2026-10-08&limit=1&cursor=${encodeURIComponent(cursor)}`),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      expect(resConflict.status).toBe(409);
      const conflictJson = await resConflict.json();
      expect(conflictJson.error).toMatchObject({
        code: "cursor_changed",
        retryable: true,
      });
    });

    it("respects timezone boundaries for session dates", async () => {
      // Session at 2026-10-01T18:30:00Z:
      // In UTC, date is 2026-10-01.
      // In Asia/Kolkata (+05:30), 18:30Z becomes 2026-10-02T00:00.
      mocks.data.mockReturnValue({
        select: () => ({
          lean: async () => ({
            revision: 1,
            sessions: [
              {
                id: "tz-session",
                date: "2026-10-01T19:00:00.000Z",
                dayId: "push-day",
                dayName: "Push",
                weightUnit: "kg",
                exercises: [
                  {
                    exerciseId: "bench-press",
                    name: "Barbell Bench Press",
                    type: "strength",
                    sets: [{ setId: "s1", targetReps: "5", loggedWeight: "60", loggedReps: "5", completed: true, setType: "working" }],
                  },
                ],
              },
            ],
            workoutTemplate: sampleWorkoutTemplate,
            settings: { timezone: "UTC" },
          }),
        }),
      });

      // Query in UTC
      const resUtc = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/bench-press/history?from=2026-10-01&to=2026-10-01&timezone=UTC"),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      const jsonUtc = await resUtc.json();
      expect(jsonUtc.history).toHaveLength(1);
      expect(jsonUtc.history[0].date).toBe("2026-10-01");

      // Query in Asia/Kolkata (+5:30 -> 2026-10-02)
      const resKol = await getExerciseHistory(
        new Request("http://localhost/api/v2/exercises/bench-press/history?from=2026-10-02&to=2026-10-02&timezone=Asia%2FKolkata"),
        { params: Promise.resolve({ id: "bench-press" }) }
      );
      const jsonKol = await resKol.json();
      expect(jsonKol.history).toHaveLength(1);
      expect(jsonKol.history[0].date).toBe("2026-10-02");
    });
  });
});
