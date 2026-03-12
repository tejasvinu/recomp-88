'use client';

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDataSnapshot } from "../types";

type SyncPayload = AppDataSnapshot;

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function useCloudSync() {
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoggedIn = !!session?.user;

  const fetchCloudData = useCallback(async (): Promise<SyncPayload | null> => {
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
        setLastSyncedAt(new Date(json.data.lastSyncedAt));
      }

      setSyncStatus("synced");
      return json.data as SyncPayload | null;
    } catch {
      setSyncStatus(
        typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error"
      );
      return null;
    }
  }, [isLoggedIn]);

  const pushToCloud = useCallback(
    async (payload: SyncPayload) => {
      if (!isLoggedIn) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        return;
      }

      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Sync failed");
        const { lastSyncedAt } = await res.json();
        setLastSyncedAt(new Date(lastSyncedAt));
        setSyncStatus("synced");
      } catch {
        setSyncStatus(
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error"
        );
      }
    },
    [isLoggedIn]
  );

  // Debounced push — call this whenever local data changes
  const schedulePush = useCallback(
    (payload: SyncPayload) => {
      if (!isLoggedIn) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => pushToCloud(payload), 3000);
    },
    [isLoggedIn, pushToCloud]
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

  return { isLoggedIn, fetchCloudData, pushToCloud, schedulePush, syncStatus, lastSyncedAt };
}
