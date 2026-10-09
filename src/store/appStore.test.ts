import { describe, expect, it } from "vitest";
import { useAppStore } from "./appStore";
import { emptySnapshot } from "@/lib/syncLedger";

describe("local sync intent", () => {
  it("records deletion and gives undo a strictly newer version", () => {
    const original = { id: "s", date: "2026-10-09T12:00:00Z", dayId: "d", dayName: "Push", exercises: [] };
    useAppStore.getState().applySnapshot(emptySnapshot());
    useAppStore.getState().setSessions([original]);
    const saved = useAppStore.getState().sessions[0];
    useAppStore.getState().setSessions([]);
    const tombstone = useAppStore.getState().syncState.tombstones.s;
    expect(tombstone).toBeGreaterThan(saved.version!);
    useAppStore.getState().setSessions([saved]);
    expect(useAppStore.getState().sessions[0].version).toBeGreaterThan(tombstone);
  });
  it("queues explicit reset without discarding the generation", () => {
    useAppStore.getState().applySnapshot({ ...emptySnapshot(), syncState: { epoch: 4, tombstones: {} } });
    useAppStore.getState().resetToDefaults();
    expect(useAppStore.getState().syncState.reset).toMatchObject({ baseEpoch: 4 });
    expect(useAppStore.getState().syncState.epoch).toBe(4);
  });
});
