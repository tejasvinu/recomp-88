import { createDefaultWorkoutTemplate } from "@/data";
import type { AppDataSnapshot, SyncLedger } from "@/types";
import { mergeBodyWeightEntries, mergeById, mergeExerciseNotes, mergeSessionHistory, mergeSettings, mergeWorkoutProgressWithPreference, type SanitizedSyncPayload } from "./sync";

export const emptySyncLedger = (): SyncLedger => ({ epoch: 0, tombstones: {} });
export function emptySnapshot(): AppDataSnapshot {
  return { workoutTemplate: createDefaultWorkoutTemplate(), progress: {}, sessions: [], bodyWeightEntries: [], exerciseNotes: {}, customExercises: [],
    settings: { weightUnit: "kg", strengthRestDuration: 120, hypertrophyRestDuration: 90, soundEnabled: true }, syncState: emptySyncLedger() };
}

export function mergeLedgerSnapshot(current: AppDataSnapshot, incoming: SanitizedSyncPayload, preferIncoming: boolean): AppDataSnapshot {
  const remote = current.syncState ?? emptySyncLedger();
  const local = incoming.syncState ?? emptySyncLedger();
  const reset = local.reset;
  if (reset && reset.id !== remote.resetId) {
    if (reset.baseEpoch !== remote.epoch) throw new Error("reset_conflict");
    return { ...emptySnapshot(), ...incoming, settings: { ...emptySnapshot().settings, ...incoming.settings },
      syncState: { epoch: remote.epoch + 1, resetId: reset.id, tombstones: {} } };
  }
  // A replay of the acknowledged reset is ignored, rather than clearing writes
  // made since it. Its snapshot still belongs to the previous generation.
  if (reset && reset.id === remote.resetId && local.epoch < remote.epoch) return current;
  if (local.epoch !== remote.epoch) throw new Error("reset_conflict");
  const tombstones = { ...remote.tombstones };
  for (const [id, version] of Object.entries(local.tombstones)) {
    Object.defineProperty(tombstones, id, { value: Math.max(tombstones[id] ?? 0, version), enumerable: true, writable: true, configurable: true });
  }
  return {
    workoutTemplate: incoming.workoutTemplate && preferIncoming ? incoming.workoutTemplate : current.workoutTemplate,
    progress: mergeWorkoutProgressWithPreference(current.progress, incoming.progress ?? {}, preferIncoming),
    sessions: mergeSessionHistory(current.sessions, incoming.sessions ?? [], preferIncoming)
      .filter(s => (s.version ?? 0) > (tombstones[s.id] ?? -1)),
    bodyWeightEntries: mergeBodyWeightEntries(current.bodyWeightEntries, incoming.bodyWeightEntries ?? [], preferIncoming),
    exerciseNotes: mergeExerciseNotes(current.exerciseNotes, incoming.exerciseNotes ?? {}, preferIncoming),
    settings: { ...current.settings, ...mergeSettings(current.settings, incoming.settings ?? {}, preferIncoming) },
    customExercises: mergeById(current.customExercises, incoming.customExercises ?? [], preferIncoming),
    syncState: { epoch: remote.epoch, resetId: remote.resetId, tombstones },
  };
}
