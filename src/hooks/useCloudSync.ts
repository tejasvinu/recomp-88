'use client';

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppDataSnapshot } from "../types";
import type { CloudSyncSnapshot, SyncPushPayload } from "../lib/sync";
import { readLocalStorageValue, writeLocalStorageValue } from "../services/storageService";

type SyncPayload = AppDataSnapshot;

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

const CLOUD_SYNC_METADATA_KEY = "recomp88-cloud-sync-metadata";

type PersistedCloudSyncMetadata = {
  accountId: string;
  lastSyncedAt: string | null;
};

const getAccountId = (user: unknown): string | null => {
  if (!user || typeof user !== "object") return null;
  const candidate = user as { id?: unknown; email?: unknown };
  if (typeof candidate.id === "string" && candidate.id.trim()) return candidate.id;
  if (typeof candidate.email === "string" && candidate.email.trim()) return candidate.email;
  return null;
};

const parseSyncDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const isPersistedCloudSyncMetadata = (value: unknown): value is PersistedCloudSyncMetadata =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PersistedCloudSyncMetadata).accountId === "string" &&
  (
    (value as PersistedCloudSyncMetadata).lastSyncedAt === null ||
    typeof (value as PersistedCloudSyncMetadata).lastSyncedAt === "string"
  );

const readPersistedLastSyncedAt = (accountId: string | null): Date | null => {
  if (!accountId) return null;
  const metadata = readLocalStorageValue<unknown>(CLOUD_SYNC_METADATA_KEY, null);
  if (!isPersistedCloudSyncMetadata(metadata) || metadata.accountId !== accountId) return null;
  return parseSyncDate(metadata.lastSyncedAt);
};

const writePersistedLastSyncedAt = (accountId: string | null, value: Date | null) => {
  if (!accountId) return;
  writeLocalStorageValue<PersistedCloudSyncMetadata>(CLOUD_SYNC_METADATA_KEY, {
    accountId,
    lastSyncedAt: value?.toISOString() ?? null,
  });
};

export function useCloudSync() {
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const accountId = getAccountId(session?.user);
  const persistedLastSyncedAt = useMemo(
    () => readPersistedLastSyncedAt(accountId),
    [accountId]
  );
  const [lastSyncedState, setLastSyncedState] = useState<{
    accountId: string | null;
    value: Date | null;
  }>({ accountId: null, value: null });
  const lastSyncedAt =
    lastSyncedState.accountId === accountId
      ? lastSyncedState.value
      : persistedLastSyncedAt;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedAtRef = useRef<Date | null>(null);

  const isLoggedIn = !!session?.user;

  useEffect(() => {
    lastSyncedAtRef.current = lastSyncedAt;
  }, [lastSyncedAt]);

  const recordLastSyncedAt = useCallback(
    (value: Date | null) => {
      const next = parseSyncDate(value);
      lastSyncedAtRef.current = next;
      setLastSyncedState({ accountId, value: next });
      writePersistedLastSyncedAt(accountId, next);
    },
    [accountId]
  );

  const getSyncBase = useCallback(
    () => lastSyncedAtRef.current ?? readPersistedLastSyncedAt(accountId),
    [accountId]
  );

  const clearScheduledPush = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const fetchCloudData = useCallback(async (): Promise<CloudSyncSnapshot | null> => {
    if (!isLoggedIn) return null;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return null;
    }

    try {
      const res = await fetch("/api/sync");
      if (!res.ok) {
        setSyncStatus("error");
        return null;
      }

      const json = await res.json();
      if (json.data?.lastSyncedAt) {
        recordLastSyncedAt(new Date(json.data.lastSyncedAt));
      }

      setSyncStatus("synced");
      return json.data as CloudSyncSnapshot | null;
    } catch {
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error"
      );
      return null;
    }
  }, [isLoggedIn, recordLastSyncedAt]);

  const pushToCloud = useCallback(
    async (payload: SyncPayload, options?: { keepalive?: boolean }) => {
      if (!isLoggedIn) return false;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        return false;
      }

      clearScheduledPush();
      setSyncStatus("syncing");
      try {
        const payloadWithSyncBase: SyncPushPayload = {
          ...payload,
          baseLastSyncedAt: getSyncBase()?.toISOString() ?? null,
        };
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadWithSyncBase),
          keepalive: options?.keepalive,
        });
        if (!res.ok) throw new Error("Sync failed");
        const { lastSyncedAt: syncedAt } = await res.json();
        if (syncedAt != null) {
          recordLastSyncedAt(new Date(syncedAt));
        }
        setSyncStatus("synced");
        return true;
      } catch {
        setSyncStatus(
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error"
        );
        return false;
      }
    },
    [clearScheduledPush, getSyncBase, isLoggedIn, recordLastSyncedAt]
  );

  // Debounced push — call this whenever local data changes
  const schedulePush = useCallback(
    (payload: SyncPayload) => {
      if (!isLoggedIn) return;
      clearScheduledPush();
      debounceTimer.current = setTimeout(() => pushToCloud(payload), 3000);
    },
    [clearScheduledPush, isLoggedIn, pushToCloud]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setSyncStatus((current) => (current === "offline" ? "idle" : current));
    };

    const handleOffline = () => {
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setSyncStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;

    clearScheduledPush();
    lastSyncedAtRef.current = null;
    setLastSyncedState({ accountId: null, value: null });
    setSyncStatus(
      typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle"
    );
  }, [clearScheduledPush, isLoggedIn]);

  useEffect(() => {
    return () => {
      clearScheduledPush();
    };
  }, [clearScheduledPush]);

  return {
    isLoggedIn,
    fetchCloudData,
    pushToCloud,
    schedulePush,
    cancelScheduledPush: clearScheduledPush,
    getSyncBase,
    syncStatus,
    lastSyncedAt,
  };
}
