import { describe, expect, it } from "vitest";
import { mergeLedgerSnapshot } from "./syncLedger";
import type { AppDataSnapshot, WorkoutSession } from "@/types";
const session = (version = 1): WorkoutSession => ({ id: "s", version, date: "2026-10-09T12:00:00Z", dayId: "d", dayName: "Push", exercises: [] });
const snapshot = (): AppDataSnapshot => ({ workoutTemplate: [], progress: {}, sessions: [session()], bodyWeightEntries: [{ date: "2026-10-09", weight: 80 }], exerciseNotes: { e: "note" }, customExercises: [], settings: { weightUnit: "kg", strengthRestDuration: 120, hypertrophyRestDuration: 90, soundEnabled: true } });
describe("versioned deletion and reset ledger", () => {
  it("persists a deletion and rejects stale resurrection", () => {
    const deleted = mergeLedgerSnapshot(snapshot(), { sessions: [], syncState: { epoch: 0, tombstones: { s: 2 } } }, true);
    expect(deleted.sessions).toEqual([]);
    expect(mergeLedgerSnapshot(deleted, { sessions: [session()] }, true).sessions).toEqual([]);
    expect(mergeLedgerSnapshot(deleted, { sessions: [session(2)] }, true).sessions).toEqual([]);
    expect(mergeLedgerSnapshot(deleted, { sessions: [session(3)] }, false).sessions).toHaveLength(1);
  });
  it("resets every collection, is idempotent and refuses pre-reset uploads", () => {
    const incoming = { ...snapshot(), sessions: [], bodyWeightEntries: [], exerciseNotes: {}, syncState: { epoch: 0, tombstones: {}, reset: { id: "reset-1", baseEpoch: 0 } } };
    const reset = mergeLedgerSnapshot(snapshot(), incoming, true);
    expect(reset.sessions).toEqual([]);
    expect(reset.bodyWeightEntries).toEqual([]);
    expect(reset.exerciseNotes).toEqual({});
    expect(reset.syncState?.epoch).toBe(1);
    expect(mergeLedgerSnapshot(reset, incoming, true).syncState?.epoch).toBe(1);
    expect(() => mergeLedgerSnapshot(reset, snapshot(), true)).toThrow("reset_conflict");
  });
  it("keeps higher entity versions regardless of snapshot conflict preference", () => {
    const current = { ...snapshot(), sessions: [session(4)] };
    expect(mergeLedgerSnapshot(current, { sessions: [session(3)] }, true).sessions[0].version).toBe(4);
  });
});
