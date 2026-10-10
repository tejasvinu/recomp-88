'use client';

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDataSnapshot } from "../types";
import type { CloudSyncSnapshot, SyncPushPayload } from "../lib/sync";
import { readLocalStorageValue, writeLocalStorageValue } from "../services/storageService";
import { selectCurrentSnapshot, useAppStore } from "../store/appStore";
import { emptySnapshot, reconcileCloudAcknowledgement } from "../lib/syncLedger";
import { CloudSyncGate, SerialTaskQueue } from "../lib/cloudSyncClient";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";
const METADATA = "recomp88-cloud-sync-metadata";
type Metadata = { accountId: string; lastSyncedAt: string | null; revision?: number };

export function useCloudSync() {
  const { data: session } = useSession();
  const accountId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [gate] = useState(() => new CloudSyncGate());
  const [queue] = useState(() => new SerialTaskQueue());
  const generation = gate.switchAccount(accountId);
  const base = useRef<{ accountId: string | null; at: Date | null; revision: number }>({ accountId: null, at: null, revision: 0 });
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previous = readLocalStorageValue<Metadata | null>(METADATA, null);
  const switchedAccount = previous?.accountId != null && previous.accountId !== accountId;
  const isLoggedIn = accountId !== null;

  const cancelScheduledPush = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
  }, []);
  const getSyncBase = useCallback(() => {
    if (base.current.accountId === accountId) return base.current.at;
    const saved = readLocalStorageValue<Metadata | null>(METADATA, null);
    return saved?.accountId === accountId && saved.lastSyncedAt ? new Date(saved.lastSyncedAt) : null;
  }, [accountId]);
  const markHydrated = useCallback(() => {
    gate.hydrate(generation);
    if (gate.canPush(generation) && accountId) {
      writeLocalStorageValue<Metadata>(METADATA, { accountId, lastSyncedAt: base.current.at?.toISOString() ?? null, revision: base.current.revision });
    }
  }, [accountId, generation, gate]);

  const fetchCloudData = useCallback(async (): Promise<CloudSyncSnapshot | null> => queue.run(async () => {
    if (!gate.isCurrent(generation)) return null;
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      if (json.accountId !== accountId || !("data" in json) || (json.data !== null && typeof json.data !== "object")) throw new Error("Invalid account snapshot");
      if (!gate.isCurrent(generation)) return null;
      const data = json.data ?? { ...emptySnapshot(), revision: 0, lastSyncedAt: null };
      base.current = { accountId, at: data.lastSyncedAt ? new Date(data.lastSyncedAt) : null, revision: data.revision ?? 0 };
      setLastSyncedAt(base.current.at);
      setSyncStatus("synced");
      return data;
    } catch {
      if (gate.isCurrent(generation)) setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return null;
    }
  }), [accountId, generation, gate, queue]);

  const pushToCloud = useCallback((payload: AppDataSnapshot, options?: { keepalive?: boolean }) => queue.run(async () => {
    if (!gate.canPush(generation)) return false;
    cancelScheduledPush();
    setSyncStatus("syncing");
    try {
      const outgoing: SyncPushPayload = { ...payload, accountId: accountId!, baseRevision: base.current.revision, baseLastSyncedAt: getSyncBase()?.toISOString() ?? null };
      const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(outgoing), keepalive: options?.keepalive });
      if (!res.ok) throw new Error("Sync failed");
      const json = await res.json();
      if (!gate.canPush(generation)) return false;
      if (!json.ok || !json.data) throw new Error("Invalid acknowledgement");
      const current = selectCurrentSnapshot(useAppStore.getState());
      const acknowledged = json.data as CloudSyncSnapshot;
      // Preserve edits made while the request was in flight. Rebase a pending
      // reset only when this response acknowledges that same reset operation.
      const next = reconcileCloudAcknowledgement(current, payload, acknowledged);
      useAppStore.getState().applySnapshot(next);
      base.current = { accountId, revision: json.revision, at: json.lastSyncedAt ? new Date(json.lastSyncedAt) : null };
      setLastSyncedAt(base.current.at);
      markHydrated();
      setSyncStatus("synced");
      return true;
    } catch {
      if (gate.isCurrent(generation)) setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return false;
    }
  }), [accountId, generation, cancelScheduledPush, getSyncBase, markHydrated, gate, queue]);

  const schedulePush = useCallback((payload: AppDataSnapshot) => {
    if (!gate.canPush(generation)) return;
    cancelScheduledPush();
    debounce.current = setTimeout(() => { void pushToCloud(payload); }, 3000);
  }, [cancelScheduledPush, generation, pushToCloud, gate]);
  useEffect(() => { cancelScheduledPush(); return cancelScheduledPush; }, [accountId, cancelScheduledPush]);
  return { accountId, isLoggedIn, switchedAccount, fetchCloudData, pushToCloud, schedulePush, cancelScheduledPush, getSyncBase, markHydrated, syncStatus, lastSyncedAt };
}
