'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { User, LogOut, LogIn, CloudUpload, CloudOff, Check, Loader2, Edit3, Scale, Trophy, CalendarDays, Activity, ChevronRight, Lock, Info, X } from "lucide-react";
import type { SessionHistory, BodyWeightEntry } from "../types";
import type { SyncStatus } from "../hooks/useCloudSync";
import { cn, shiftLocalDateKey, toLocalDateKey } from "../utils";

interface ProfileTabProps {
  sessions: SessionHistory;
  bodyWeightEntries: BodyWeightEntry[];
  weightUnit: "kg" | "lbs";
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  /** How overlapping fields were merged on last pull (null if none / first cloud). */
  mergeSummary: string | null;
  onDismissMergeSummary: () => void;
  onManualSync: () => void;
}

function getStats(sessions: SessionHistory) {
  const totalWorkouts = sessions.length;
  const totalSets = sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.length, 0),
    0
  );
  const totalTime = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const hours = Math.floor(totalTime / 3600);
  const mins = Math.floor((totalTime % 3600) / 60);

  // Streak calculation — also counts from yesterday if no workout today
  const sortedDates = [
    ...new Set(
      sessions
        .map((s) => toLocalDateKey(s.date))
        .filter((dateKey): dateKey is string => Boolean(dateKey))
    ),
  ].sort().reverse();
  let streak = 0;
  const today = toLocalDateKey();
  // Start from today, and if no workout today, try from yesterday
  let checkDate = today;
  if (sortedDates.length > 0 && sortedDates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    checkDate = toLocalDateKey(yesterday);
  }
  for (const d of sortedDates) {
    if (d === checkDate) {
      streak++;
      checkDate = shiftLocalDateKey(checkDate, -1);
    } else if (d < checkDate) {
      break;
    }
  }

  // Most trained day name
  const dayCounts: Record<string, number> = {};
  sessions.forEach((s) => { dayCounts[s.dayName] = (dayCounts[s.dayName] || 0) + 1; });
  const favDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return { totalWorkouts, totalSets, hours, mins, streak, favDay };
}

const syncLabels: Record<SyncStatus, { text: string; color: string }> = {
  idle: { text: "Not synced yet", color: "text-neutral-500" },
  syncing: { text: "Syncing…", color: "text-lime-400" },
  synced: { text: "Synced", color: "text-lime-400" },
  error: { text: "Sync failed", color: "text-red-400" },
  offline: { text: "Offline", color: "text-amber-400" },
};

export default function ProfileTab({
  sessions,
  bodyWeightEntries,
  weightUnit,
  syncStatus,
  lastSyncedAt,
  mergeSummary,
  onDismissMergeSummary,
  onManualSync,
}: ProfileTabProps) {
  const { data: session, update } = useSession();
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stats = getStats(sessions);
  const latestBW = bodyWeightEntries.length
    ? [...bodyWeightEntries].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const saveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const responseBody = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof responseBody?.error === "string" ? responseBody.error : "Could not update profile"
        );
      }

      // Refresh the session without destroying page state
      await update({ name: newName.trim() });
      setEditName(false);
      setSaving(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update profile");
      setSaving(false);
    }
  };

  const isLoggedIn = !!session?.user;
  const syncLabel = syncLabels[syncStatus];

  return (
    <div className="space-y-4 pb-4">
      {/* ── Profile Card ── */}
      <div className="bg-neutral-900/60 border border-white/6 rounded-2xl p-5">
        {isLoggedIn ? (
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {session.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "Profile"}
                  className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                  <User size={24} className="text-lime-400" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-lime-400 border-2 border-[#080808]" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editName ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") {
                          setEditName(false);
                          setSaveError(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-white/5 border border-lime-400/30 rounded-lg px-2 py-1 text-sm text-neutral-100 focus:outline-none"
                    />
                    <button onClick={saveName} disabled={saving} className="text-lime-400 hover:text-lime-300">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                  </div>
                  {saveError && <p className="text-[10px] text-red-400 mb-1">{saveError}</p>}
                </>
              ) : (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="font-bold text-white truncate">{session.user?.name}</p>
                  <button
                    onClick={() => {
                      setNewName(session.user?.name ?? "");
                      setSaveError(null);
                      setEditName(true);
                    }}
                    className="text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              )}
              <p className="text-xs text-neutral-500 truncate">{session.user?.email}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", syncStatus === "synced" ? "bg-lime-400" : syncStatus === "error" ? "bg-red-400" : syncStatus === "syncing" ? "bg-lime-400 animate-pulse" : "bg-neutral-600")} />
                <span className={cn("text-[10px] font-semibold uppercase tracking-widest", syncLabel.color)}>
                  {syncLabel.text}
                </span>
                {lastSyncedAt && syncStatus === "synced" && (
                  <span className="text-[10px] text-neutral-700 ml-1">
                    {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Not logged in state */
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-white/8 flex items-center justify-center mb-3">
              <User size={24} className="text-neutral-500" />
            </div>
            <p className="font-bold text-white mb-0.5">Guest Mode</p>
            <p className="text-xs text-neutral-500 mb-4">Sign in to sync your data across devices</p>
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-400 text-neutral-950 text-xs font-black uppercase tracking-widest hover:bg-lime-300 transition-all shadow-[0_0_15px_rgba(163,230,53,0.25)]"
            >
              <LogIn size={14} />
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* ── Cloud Sync Banner ── */}
      {isLoggedIn && (
        <div className="bg-neutral-900/60 border border-white/6 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                {syncStatus === "syncing" ? (
                  <Loader2 size={15} className="text-lime-400 animate-spin" />
                ) : syncStatus === "error" ? (
                  <CloudOff size={15} className="text-red-400" />
                ) : (
                  <CloudUpload size={15} className="text-lime-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-200">Cloud Backup</p>
                <p className="text-[10px] text-neutral-600">
                  {syncStatus === "syncing"
                    ? "Uploading…"
                    : syncStatus === "error"
                    ? "Tap to retry"
                    : "Auto-synced across devices"}
                </p>
              </div>
            </div>
            <button
              onClick={onManualSync}
              disabled={syncStatus === "syncing"}
              className="px-3 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[10px] font-bold uppercase tracking-widest hover:bg-lime-400/20 transition-all disabled:opacity-50"
            >
              Sync Now
            </button>
          </div>
          {mergeSummary && (
            <div className="px-4 pb-3 pt-0 border-t border-white/4">
              <div className="flex gap-2 rounded-xl bg-sky-400/8 border border-sky-400/15 px-3 py-2.5">
                <Info size={14} className="text-sky-400 shrink-0 mt-0.5" aria-hidden />
                <p className="text-[11px] text-sky-200/90 leading-snug flex-1">{mergeSummary}</p>
                <button
                  type="button"
                  onClick={onDismissMergeSummary}
                  className="shrink-0 text-sky-500/80 hover:text-sky-300 p-0.5 rounded"
                  aria-label="Dismiss merge note"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2 px-1">Stats</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Trophy, label: "Workouts", value: stats.totalWorkouts.toString(), color: "text-lime-400" },
            { icon: Activity, label: "Streak", value: `${stats.streak}d`, color: "text-amber-400" },
            { icon: CalendarDays, label: "Sets Logged", value: stats.totalSets.toString(), color: "text-sky-400" },
            { icon: Scale, label: "Body Weight", value: latestBW ? `${latestBW.weight} ${weightUnit}` : "—", color: "text-purple-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-neutral-900/60 border border-white/6 rounded-2xl p-4 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-white/5", color)}>
                <Icon size={16} strokeWidth={2} />
              </div>
              <div>
                <p className={cn("text-lg font-black tabular-nums", color)}>{value}</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Training time ── */}
      {stats.totalWorkouts > 0 && (
        <div className="bg-neutral-900/60 border border-white/6 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-0.5">Total Training Time</p>
            <p className="font-black text-white">
              {stats.hours > 0 ? `${stats.hours}h ` : ""}{stats.mins}m
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-0.5">Favourite Day</p>
            <p className="font-bold text-lime-400 text-sm">{stats.favDay}</p>
          </div>
        </div>
      )}

      {/* ── Account Actions ── */}
      {isLoggedIn && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2 px-1">Account</h2>
          <div className="bg-neutral-900/60 border border-white/6 rounded-2xl overflow-hidden divide-y divide-white/4">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/4 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={15} className="text-red-400" />
                <span className="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors">Sign Out</span>
              </div>
              <ChevronRight size={14} className="text-neutral-700" />
            </button>
          </div>
        </div>
      )}

      {!isLoggedIn && sessions.length > 0 && (
        <div className="bg-amber-400/5 border border-amber-400/15 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Lock size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/80">
            You have <strong className="text-amber-400">{sessions.length} workout sessions</strong> stored locally. Sign in to back them up to the cloud.
          </p>
        </div>
      )}
    </div>
  );
}
