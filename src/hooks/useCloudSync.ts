'use client';

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDataSnapshot } from "../types";
import type { CloudSyncSnapshot, SyncPushPayload } from "../lib/sync";

type SyncPayload = AppDataSnapshot;

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function useCloudSync() {
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedAtRef = useRef<Date | null>(null);

  const isLoggedIn = !!session?.user;

  useEffect(() => {
    lastSyncedAtRef.current = lastSyncedAt;
  }, [lastSyncedAt]);

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
        const syncedAt = new Date(json.data.lastSyncedAt);
        lastSyncedAtRef.current = syncedAt;
        setLastSyncedAt(syncedAt);
      }

      setSyncStatus("synced");
      return json.data as CloudSyncSnapshot | null;
    } catch {
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error"
      );
      return null;
    }
  }, [isLoggedIn]);

  const pushToCloud = useCallback(
    async (payload: SyncPayload) => {
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
          baseLastSyncedAt: lastSyncedAtRef.current?.toISOString() ?? null,
        };
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadWithSyncBase),
        });
        if (!res.ok) throw new Error("Sync failed");
        const { lastSyncedAt: syncedAt } = await res.json();
        if (syncedAt != null) {
          const syncedAtDate = new Date(syncedAt);
          lastSyncedAtRef.current = syncedAtDate;
          setLastSyncedAt(syncedAtDate);
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
    [clearScheduledPush, isLoggedIn]
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
    setLastSyncedAt(null);
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
    syncStatus,
    lastSyncedAt,
  };
}
