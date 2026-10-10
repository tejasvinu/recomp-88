'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import {
  createExtraSetId,
  createDefaultWorkoutTemplate,
  getExerciseSetsWithExtras,
  isExtraSetState,
  normalizeWorkoutTemplate,
  pruneExerciseNotesForWorkoutTemplate,
  pruneProgressForWorkoutTemplate,
} from "./data";
import { useToast } from "./hooks/useToast";
import { useRestTimer } from "./hooks/useRestTimer";
import { useWorkoutTimer } from "./hooks/useWorkoutTimer";
import { useCloudSync } from "./hooks/useCloudSync";
import { buildWorkoutSession, computeAllTimePRs } from "./services/workoutService";
import { displaySession, displayBodyWeight, convertWeightLog } from "./lib/trainingMath";
import { mergeLedgerSnapshot, stripSyncMetadata, reconcileCloudAcknowledgement } from "./lib/syncLedger";
import {
  hasRemoteChangesSinceBase,
  sanitizeSyncPayload,
} from "./lib/sync";
import type {
  AppDataSnapshot,
  ExerciseWiki,
  WorkoutSession,
} from "./types";
import { toLocalDateKey } from "./utils";
import {
  findWikiEntry,
  isFreeWeightFriendly,
  resolvePrimaryFreeWeightAlternative,
} from "./wikiData";

// ─── Zustand store ────────────────────────────────────────────────────────────
import {
  useAppStore,
  hydrateStoreFromStorage,
  selectCurrentSnapshot,
} from "./store/appStore";

// ─── New sub-components ────────────────────────────────────────────────────
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import DashboardTab from "./components/DashboardTab";

// ─── Existing components ──────────────────────────────────────────────────
import ErrorBoundary from "./components/ErrorBoundary";
import WorkoutTab from "./components/WorkoutTab";
import RecoveryTab from "./components/RecoveryTab";
import RestTimerToast from "./components/RestTimerToast";
import DayCompleteOverlay from "./components/DayCompleteOverlay";
import GlobalModals from "./components/GlobalModals";
import JustShowUpModal from "./components/JustShowUpModal";
import ToastContainer from "./components/ui/ToastContainer";
import InstallPrompt from "./components/InstallPrompt";
import { SegmentedControl } from "./components/ui/primitives";
import { WorkoutActionsProvider, type WorkoutActions } from "./components/workout/WorkoutActionsContext";

const WikiView = lazy(() => import("./components/WikiView"));
const ChartsView = lazy(() => import("./components/ChartsView"));
const ExerciseRecordsView = lazy(() => import("./components/ExerciseRecordsView"));
const ProfileTab = lazy(() => import("./components/ProfileTab"));

// ─── Module-level helpers (no state dependency) ───────────────────────────
const slugifyName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

const createWorkoutExerciseId = (dayId: string, exerciseName: string) => {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 6)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return `${dayId}-${slugifyName(exerciseName) || "exercise"}-${suffix}`;
};

const stableStringify = (value: unknown) =>
  JSON.stringify(value, (_key, v) => {
    if (Array.isArray(v) || v === null || typeof v !== "object") return v;
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    );
  });

const hasImportableSyncFields = (
  value: ReturnType<typeof sanitizeSyncPayload>
): value is NonNullable<ReturnType<typeof sanitizeSyncPayload>> =>
  !!value &&
  (
    value.workoutTemplate !== undefined ||
    value.progress !== undefined ||
    value.sessions !== undefined ||
    value.bodyWeightEntries !== undefined ||
    value.exerciseNotes !== undefined ||
    value.settings !== undefined ||
    value.customExercises !== undefined
  );

// ─── Loading spinner ──────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
  </div>
);

function AppMain() {
  // ─── Global store (individual selectors for stability) ──────────────────
  const progress = useAppStore((s) => s.progress);
  const setProgress = useAppStore((s) => s.setProgress);
  const storedSessions = useAppStore((s) => s.sessions);
  const setSessions = useAppStore((s) => s.setSessions);
  const syncState = useAppStore((s) => s.syncState);
  const storedBodyWeightEntries = useAppStore((s) => s.bodyWeightEntries);
  const setBodyWeightEntries = useAppStore((s) => s.setBodyWeightEntries);
  const exerciseNotes = useAppStore((s) => s.exerciseNotes);
  const setExerciseNotes = useAppStore((s) => s.setExerciseNotes);
  const weightUnit = useAppStore((s) => s.weightUnit);
  const timezone = useAppStore((s) => s.timezone);
  const sessions = useMemo(() => storedSessions.map(s => displaySession(s, weightUnit)), [storedSessions, weightUnit]);
  const bodyWeightEntries = useMemo(() => storedBodyWeightEntries.map(e => displayBodyWeight(e, weightUnit)), [storedBodyWeightEntries, weightUnit]);
  const setWeightUnit = useAppStore((s) => s.setWeightUnit);
  const customExercises = useAppStore((s) => s.customExercises);
  const setCustomExercises = useAppStore((s) => s.setCustomExercises);
  const strengthRestDuration = useAppStore((s) => s.strengthRestDuration);
  const hypertrophyRestDuration = useAppStore((s) => s.hypertrophyRestDuration);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const activeDayIndex = useAppStore((s) => s.activeDayIndex);
  const setActiveDayIndex = useAppStore((s) => s.setActiveDayIndex);
  const selectedStretchingProgramId = useAppStore((s) => s.selectedStretchingProgramId);
  const setSelectedStretchingProgramId = useAppStore((s) => s.setSelectedStretchingProgramId);
  const applySnapshot = useAppStore((s) => s.applySnapshot);

  // Derived / memoised from the store
  const safeWorkoutTemplate = useAppStore((s) => s.workoutTemplate);
  const currentSnapshot = useMemo((): AppDataSnapshot => ({
    syncState,
    workoutTemplate: safeWorkoutTemplate,
    progress,
    sessions: storedSessions,
    bodyWeightEntries: storedBodyWeightEntries,
    exerciseNotes,
    settings: {
      strengthRestDuration,
      hypertrophyRestDuration,
      soundEnabled,
      weightUnit,
      timezone,
    },
    customExercises,
  }), [syncState, safeWorkoutTemplate, progress, storedSessions, storedBodyWeightEntries, timezone, exerciseNotes, strengthRestDuration, hypertrophyRestDuration, soundEnabled, weightUnit, customExercises]);

  // Keep a stable ref of the snapshot for callbacks that need stale-proof reads
  const currentSnapshotRef = useRef(currentSnapshot);
  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const getFreshSnapshot = useCallback((): AppDataSnapshot => selectCurrentSnapshot(useAppStore.getState()), []);

  const clampedActiveDayIndex = Math.min(activeDayIndex, Math.max(safeWorkoutTemplate.length - 1, 0));
  const activeDay = safeWorkoutTemplate[clampedActiveDayIndex];

  // Clamp activeDayIndex if template shrinks (AppMain mounts only after localStorage hydrate)
  useEffect(() => {
    if (activeDayIndex !== clampedActiveDayIndex) {
      setActiveDayIndex(clampedActiveDayIndex);
    }
  }, [activeDayIndex, clampedActiveDayIndex, setActiveDayIndex]);

  // Hydration guard moved to bottom
  // ─── Cloud sync ─────────────────────────────────────────────────────────
  const {
    accountId,
    markHydrated,
    isLoggedIn,
    fetchCloudData,
    schedulePush,
    cancelScheduledPush,
    pushToCloud,
    getSyncBase,
    syncStatus,
    lastSyncedAt,
    switchedAccount,
  } = useCloudSync();

  const cloudBootstrapped = useRef<string | null>(null);
  const skipNextCloudPushRef = useRef(0);
  const suppressOverlayRef = useRef(false);
  const [canPushCloud, setCanPushCloud] = useState(false);
  const [lastMergeSummary, setLastMergeSummary] = useState<string | null>(null);

  useEffect(() => { if (!isLoggedIn) setLastMergeSummary(null); }, [isLoggedIn]);

  // ─── Hooks ────────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast();
  const restTimer = useRestTimer({ soundEnabled, strengthDuration: strengthRestDuration, hypertrophyDuration: hypertrophyRestDuration });
  const workoutTimer = useWorkoutTimer();

  // ─── Local UI state (not global) ─────────────────────────────────────
  const [modalEntry, setModalEntry] = useState<ExerciseWiki | null>(null);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false);
  const [showAddPastSession, setShowAddPastSession] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showJustShowUp, setShowJustShowUp] = useState(false);
  const [progressSubView, setProgressSubView] = useState<"charts" | "records">("charts");

  // ─── Computed ─────────────────────────────────────────────────────────
  const progressPercent = useMemo(() => {
    let total = 0, completed = 0;
    activeDay.exercises.forEach((ex) => {
      const sets = getExerciseSetsWithExtras(ex, progress[activeDay.id]?.[ex.id]);
      total += sets.length;
      sets.forEach((set) => {
        if (progress[activeDay.id]?.[ex.id]?.[set.id]?.completed) completed++;
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [progress, activeDay]);

  const allTimePRs = useMemo(() => computeAllTimePRs(safeWorkoutTemplate, sessions, bodyWeightEntries, weightUnit), [safeWorkoutTemplate, sessions, bodyWeightEntries, weightUnit]);

  const lastSessionValues = useMemo(() => {
    const values: Record<string, Record<string, Record<string, { weight: string; reps: string }>>> = {};
    safeWorkoutTemplate.forEach((day) => {
      const daySessions = sessions
        .filter((s) => s.dayId === day.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (!daySessions.length) return;
      values[day.id] = {};
      day.exercises.forEach((exercise) => {
        const match = daySessions
          .flatMap((s) => s.exercises)
          .find((se) => se.exerciseId === exercise.id || se.name === exercise.name);
        if (!match) return;
        values[day.id][exercise.id] = {};
        exercise.sets.forEach((set, i) => {
          const prev = match.sets[i];
          if (!prev) return;
          values[day.id][exercise.id][set.id] = { weight: prev.loggedWeight, reps: prev.loggedReps };
        });
      });
    });
    return values;
  }, [safeWorkoutTemplate, sessions]);

  // ─── Day complete overlay ─────────────────────────────────────────────
  const prevProgressPercent = useRef<number>(0);
  useEffect(() => {
    if (suppressOverlayRef.current) {
      suppressOverlayRef.current = false;
      prevProgressPercent.current = progressPercent;
      return;
    }
    if (progressPercent === 100 && prevProgressPercent.current < 100) {
      setShowDayComplete(true);
      if ("vibrate" in navigator) navigator.vibrate([50, 30, 80]);
      const t = setTimeout(() => setShowDayComplete(false), 3000);
      return () => clearTimeout(t);
    }
    prevProgressPercent.current = progressPercent;
  }, [progressPercent]);

  // ─── Cloud sync helpers ───────────────────────────────────────────────
  const resolveSnapshotSettings = useCallback(
    (settings: Partial<AppDataSnapshot["settings"]>, fallback: AppDataSnapshot["settings"]): AppDataSnapshot["settings"] => ({
      strengthRestDuration: typeof settings.strengthRestDuration === "number" ? settings.strengthRestDuration : fallback.strengthRestDuration,
      hypertrophyRestDuration: typeof settings.hypertrophyRestDuration === "number" ? settings.hypertrophyRestDuration : fallback.hypertrophyRestDuration,
      soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : fallback.soundEnabled,
      timezone: settings.timezone ?? fallback.timezone,
      weightUnit: settings.weightUnit === "kg" || settings.weightUnit === "lbs" ? settings.weightUnit : fallback.weightUnit,
    }),
    []
  );

  /** Apply a snapshot from cloud into the Zustand store (skipping identical data). */
  const applyCloudSnapshot = useCallback(
    (snapshot: AppDataSnapshot): boolean => {
      if (stableStringify(selectCurrentSnapshot(useAppStore.getState())) === stableStringify(stripSyncMetadata(snapshot))) return false;
      skipNextCloudPushRef.current += 1;
      suppressOverlayRef.current = true;
      applySnapshot(snapshot);
      return true;
    },
    [applySnapshot]
  );

  const pullAndMergeCloudData = useCallback(
    async (silent = true, options?: { clean?: boolean }) => {
      if (!isLoggedIn) return null;
      const syncBase = getSyncBase();
      const data = await fetchCloudData();
      if (!data) { if (!silent) showToast("Cloud data unavailable", "error"); return null; }
      try {
        const local = getFreshSnapshot();
        const cloud: AppDataSnapshot = stripSyncMetadata({ ...data, settings: resolveSnapshotSettings(data.settings ?? {}, local.settings) });
        let merged: AppDataSnapshot;
        if (options?.clean) {
          merged = cloud;
          restTimer.dismissTimer();
          workoutTimer.reset();
        } else if (local.syncState?.reset) {
          merged = reconcileCloudAcknowledgement(local, null, cloud);
        } else if ((cloud.syncState?.epoch ?? 0) > (local.syncState?.epoch ?? 0)) {
          merged = cloud;
          restTimer.dismissTimer();
          workoutTimer.reset();
        } else {
          merged = mergeLedgerSnapshot(cloud, local, !hasRemoteChangesSinceBase(syncBase, data.lastSyncedAt));
        }
        cancelScheduledPush();
        applyCloudSnapshot(merged);
        markHydrated();
        setCanPushCloud(true);
        if (stableStringify(merged) !== stableStringify(cloud)) {
          const pushed = await pushToCloud(merged);
          if (!silent) showToast(pushed ? "Cloud sync complete" : "Cloud sync failed", pushed ? undefined : "error");
        } else if (!silent) showToast("Cloud data loaded for this account");
        return { mergedSnapshot: merged, mergeSummary: null };
      } catch {
        if (!silent) showToast("Cloud sync failed", "error");
        return null;
      }
    },
    // Timer methods change as the timer ticks; they are accessed via the current
    // closure only when an account/reset needs a clean dataset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyCloudSnapshot, cancelScheduledPush, fetchCloudData, getFreshSnapshot, getSyncBase, isLoggedIn, markHydrated, pushToCloud, resolveSnapshotSettings, showToast]
  );

  useEffect(() => {
    if (!accountId) { cloudBootstrapped.current = null; setCanPushCloud(false); return; }
    if (cloudBootstrapped.current === accountId) return;
    setCanPushCloud(false);
    cloudBootstrapped.current = accountId;
    void pullAndMergeCloudData(true, { clean: switchedAccount });
  }, [accountId, pullAndMergeCloudData, switchedAccount]);

  // Auto-push on data change
  useEffect(() => {
    if (!isLoggedIn || !canPushCloud) return;
    if (skipNextCloudPushRef.current > 0) { skipNextCloudPushRef.current -= 1; return; }
    schedulePush(currentSnapshot);
  }, [canPushCloud, currentSnapshot, isLoggedIn, schedulePush]);

  // Auto-pull on focus / flush on background
  useEffect(() => {
    if (!isLoggedIn || !canPushCloud) return;
    const onFocus = () => pullAndMergeCloudData(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
      else if (document.visibilityState === "hidden") {
        cancelScheduledPush();
        void pushToCloud(getFreshSnapshot(), { keepalive: true });
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isLoggedIn, canPushCloud, pullAndMergeCloudData, cancelScheduledPush, pushToCloud, getFreshSnapshot]);

  const handleManualSync = useCallback(async () => {
    await pullAndMergeCloudData(false, { clean: switchedAccount });
  }, [pullAndMergeCloudData, switchedAccount]);

  // ─── Weight unit handler (also persists to profile API) ──────────────
  const handleSetWeightUnit = useCallback(
    (fn: (v: "kg" | "lbs") => "kg" | "lbs") => {
      const state = useAppStore.getState();
      const next = fn(state.weightUnit);
      if (next === state.weightUnit) return;
      const converted = Object.fromEntries(Object.entries(state.progress).map(([dayId, exercises]) => [dayId,
        Object.fromEntries(Object.entries(exercises).map(([exId, sets]) => [exId,
          Object.fromEntries(Object.entries(sets).map(([id, set]) => [id, { ...set,
            loggedWeight: set.weightUnit ? convertWeightLog(set.loggedWeight, set.weightUnit, next) : set.loggedWeight,
            weightUnit: set.weightUnit ? next : undefined,
          }]))
        ]))
      ]));
      state.setProgress(converted);
      setWeightUnit(next);
      if (isLoggedIn) void fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weightUnit: next }) }).catch(() => {});
    },
    [isLoggedIn, setWeightUnit]
  );

  // ─── Template helpers ─────────────────────────────────────────────────
  const applyWorkoutTemplate = useCallback(
    (nextTemplate: typeof safeWorkoutTemplate, successMessage?: string) => {
      const normalized = normalizeWorkoutTemplate(nextTemplate);
      if (!normalized) { showToast("Invalid workout template", "error"); return null; }
      // Store setter handles pruning via applySnapshot for the new template
      setProgress((prev) => pruneProgressForWorkoutTemplate(prev, normalized));
      setExerciseNotes((prev) => pruneExerciseNotesForWorkoutTemplate(prev, normalized));
      setActiveDayIndex(Math.min(activeDayIndex, Math.max(normalized.length - 1, 0)));
      // Use the store's workout template setter directly
      useAppStore.getState().setWorkoutTemplate(normalized);
      if (successMessage) showToast(successMessage);
      return normalized;
    },
    [activeDayIndex, setProgress, setExerciseNotes, setActiveDayIndex, showToast]
  );

  // ─── Set-level actions ────────────────────────────────────────────────
  const toggleSet = useCallback(
    (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => {
      const wasCompleted = currentSnapshotRef.current.progress[dayId]?.[exerciseId]?.[setId]?.completed ?? false;
      setProgress((prev) => {
        const dayP = prev[dayId] || {};
        const exP = dayP[exerciseId] || {};
        const setP = exP[setId] || { completed: false, loggedWeight: "", loggedReps: "" };
        const nowCompleted = !setP.completed;
        return { ...prev, [dayId]: { ...dayP, [exerciseId]: { ...exP, [setId]: { ...setP, completed: nowCompleted, completedAt: nowCompleted ? Date.now() : undefined } } } };
      });
      if (!wasCompleted) {
        if ("vibrate" in navigator) navigator.vibrate(50);
        workoutTimer.start(activeDay);
        if (restType !== "other") restTimer.startTimer(restType as "strength" | "hypertrophy");
      }
    },
    [setProgress, workoutTimer, restTimer, activeDay]
  );

  const updateSetData = useCallback(
    (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps" | "rpe" | "setType" | "completedAt", value: string | number | undefined) => {
      setProgress((prev) => {
        const dayP = prev[dayId] || {};
        const exP = dayP[exerciseId] || {};
        const setP = exP[setId] || { completed: false, loggedWeight: "", loggedReps: "" };
        return { ...prev, [dayId]: { ...dayP, [exerciseId]: { ...exP, [setId]: { ...setP, [field]: value, ...(field === "loggedWeight" ? { weightUnit } : {}) } } } };
      });
    },
    [setProgress, weightUnit]
  );

  const addExtraSet = useCallback(
    (dayId: string, exerciseId: string) => {
      const day = safeWorkoutTemplate.find((item) => item.id === dayId);
      const exercise = day?.exercises.find((item) => item.id === exerciseId);
      if (!day || !exercise || exercise.type === "other") return;

      const currentExerciseProgress = currentSnapshotRef.current.progress[dayId]?.[exerciseId];
      const plannedSetsComplete = exercise.sets.every(
        (set) => currentExerciseProgress?.[set.id]?.completed
      );
      if (!plannedSetsComplete) {
        showToast("Complete the planned sets first", "error");
        return;
      }

      const currentSets = getExerciseSetsWithExtras(exercise, currentExerciseProgress);
      const previousSet = currentSets[currentSets.length - 1];
      const previousState = previousSet ? currentExerciseProgress?.[previousSet.id] : undefined;
      const fallbackTarget =
        previousState?.targetReps ||
        previousSet?.targetReps ||
        exercise.sets[exercise.sets.length - 1]?.targetReps ||
        "8-12";
      const setId = createExtraSetId();

      setProgress((prev) => {
        const dayP = prev[dayId] || {};
        const exP = dayP[exerciseId] || {};
        return {
          ...prev,
          [dayId]: {
            ...dayP,
            [exerciseId]: {
              ...exP,
              [setId]: {
                completed: false,
                loggedWeight: previousState?.loggedWeight || "",
                loggedReps: "",
                setType: previousState?.setType || "working",
                targetReps: fallbackTarget,
                isExtra: true,
              },
            },
          },
        };
      });
      showToast("Extra set added");
    },
    [safeWorkoutTemplate, setProgress, showToast]
  );

  const removeExtraSet = useCallback(
    (dayId: string, exerciseId: string, setId: string) => {
      const setState = currentSnapshotRef.current.progress[dayId]?.[exerciseId]?.[setId];
      if (!isExtraSetState(setId, setState)) return;

      setProgress((prev) => {
        const dayP = prev[dayId];
        const exP = dayP?.[exerciseId];
        if (!dayP || !exP || !exP[setId]) return prev;

        const nextExP = { ...exP };
        delete nextExP[setId];
        return { ...prev, [dayId]: { ...dayP, [exerciseId]: nextExP } };
      });
      showToast("Extra set removed");
    },
    [setProgress, showToast]
  );

  const adjustWeight = useCallback(
    (exerciseId: string, setId: string, delta: number) => {
      const currentVal = progress[activeDay.id]?.[exerciseId]?.[setId]?.loggedWeight || "";
      if (currentVal.startsWith("BW")) {
        const offset = currentVal.replace("BW", "").replace("+", "");
        const cur = offset ? parseFloat(offset) : 0;
        const next = Math.round((cur + delta) * 100) / 100;
        updateSetData(activeDay.id, exerciseId, setId, "loggedWeight", next === 0 ? "BW" : (next > 0 ? `BW+${next}` : `BW${next}`));
        return;
      }
      const cur = parseFloat(currentVal);
      const base = isNaN(cur) ? 0 : cur;
      const next = Math.max(0, Math.round((base + delta) * 100) / 100);
      updateSetData(activeDay.id, exerciseId, setId, "loggedWeight", next > 0 ? String(next) : "");
    },
    [progress, activeDay.id, updateSetData]
  );

  const handleBwFill = useCallback(
    (exerciseId: string) => {
      const exercise = activeDay.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      const visibleSets = getExerciseSetsWithExtras(exercise, progress[activeDay.id]?.[exercise.id]);
      const allBw = visibleSets.every((set) => (progress[activeDay.id]?.[exercise.id]?.[set.id]?.loggedWeight ?? "") === "BW");
      const newValue = allBw ? "" : "BW";
      setProgress((prev) => {
        const dayP = prev[activeDay.id] || {};
        const exP = { ...(dayP[exerciseId] || {}) };
        visibleSets.forEach((set) => {
          exP[set.id] = { ...(exP[set.id] || { completed: false, loggedWeight: "", loggedReps: "" }), loggedWeight: newValue };
        });
        return { ...prev, [activeDay.id]: { ...dayP, [exerciseId]: exP } };
      });
    },
    [activeDay, progress, setProgress]
  );

  const loadLastSession = useCallback(
    (exerciseId: string) => {
      const lastVals = lastSessionValues[activeDay.id]?.[exerciseId];
      if (!lastVals) return;
      const exercise = activeDay.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      setProgress((prev) => {
        const dayP = prev[activeDay.id] || {};
        const exP = { ...(dayP[exerciseId] || {}) };
        let changed = false;
        exercise.sets.forEach((set) => {
          const vals = lastVals[set.id];
          if (!vals) return;
          const cur = exP[set.id] || { completed: false, loggedWeight: "", loggedReps: "" };
          if (cur.loggedWeight === vals.weight && cur.loggedReps === vals.reps) return;
          changed = true;
          exP[set.id] = { ...cur, loggedWeight: vals.weight, loggedReps: vals.reps };
        });
        if (!changed) return prev;
        return { ...prev, [activeDay.id]: { ...dayP, [exerciseId]: exP } };
      });
      showToast("Loaded last session");
    },
    [activeDay, lastSessionValues, setProgress, showToast]
  );

  const clearCheckmarks = useCallback(() => {
    setProgress((prev) => {
      const dayP = prev[activeDay.id];
      if (!dayP) return prev;
      const newDayP = { ...dayP };
      Object.keys(newDayP).forEach((exId) => {
        newDayP[exId] = { ...newDayP[exId] };
        Object.keys(newDayP[exId]).forEach((setId) => {
          if (isExtraSetState(setId, newDayP[exId][setId])) {
            delete newDayP[exId][setId];
            return;
          }
          newDayP[exId][setId] = { ...newDayP[exId][setId], completed: false, rpe: undefined, completedAt: undefined };
        });
      });
      return { ...prev, [activeDay.id]: newDayP };
    });
    showToast("Workout progress cleared");
  }, [activeDay.id, setProgress, showToast]);

  const finishWorkout = useCallback(() => {
    const previousProgress = structuredClone(progress);
    const dayProgress = progress[activeDay.id];
    let addedSessionId = "";

    if (dayProgress) {
      const hasData = activeDay.exercises.some((ex) =>
        getExerciseSetsWithExtras(ex, dayProgress[ex.id]).some((set) => { const s = dayProgress[ex.id]?.[set.id]; return s && (s.loggedWeight || s.loggedReps || s.completed); })
      );
      if (hasData) {
        const session = buildWorkoutSession(activeDay, dayProgress, storedBodyWeightEntries, weightUnit,
          workoutTimer.getDuration() ?? 0, workoutTimer.getSessionMetadata());
        if (!session) return;
        addedSessionId = session.id;
        setSessions((prev) => [...prev, session]);
      }
    }

    // Clear checkmarks, keep weights/reps
    setProgress((prev) => {
      const dayP = prev[activeDay.id];
      if (!dayP) return prev;
      const newDayP = { ...dayP };
      Object.keys(newDayP).forEach((exId) => {
        newDayP[exId] = { ...newDayP[exId] };
        Object.keys(newDayP[exId]).forEach((setId) => {
          if (isExtraSetState(setId, newDayP[exId][setId])) {
            delete newDayP[exId][setId];
            return;
          }
          newDayP[exId][setId] = { ...newDayP[exId][setId], completed: false, rpe: undefined, completedAt: undefined };
        });
      });
      return { ...prev, [activeDay.id]: newDayP };
    });

    restTimer.dismissTimer();
    workoutTimer.reset();
    setShowFinishConfirm(false);

    showToast(
      `${activeDay.name} saved!`,
      "success",
      addedSessionId
        ? () => {
          setProgress(previousProgress);
          setSessions((prev) => prev.filter((s) => s.id !== addedSessionId));
          showToast("Workout restored");
        }
        : undefined
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [progress, activeDay, workoutTimer, restTimer, setProgress, setSessions, showToast, storedBodyWeightEntries, weightUnit]);

  const handleResetTimer = useCallback(() => { workoutTimer.reset(); showToast("Timer reset"); }, [workoutTimer, showToast]);
  const deleteSession = useCallback((id: string) => { setSessions((prev) => prev.filter((s) => s.id !== id)); showToast("Session deleted"); }, [setSessions, showToast]);

  const handleAddPastSessions = useCallback((newSessions: WorkoutSession[]) => {
    setSessions((prev) => [...prev, ...newSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    showToast(`Added ${newSessions.length} past session${newSessions.length !== 1 ? "s" : ""}`, "success");
    setShowAddPastSession(false);
  }, [setSessions, showToast]);

  // "Just Show Up" — record a lightweight, low-pressure session. It counts toward
  // the streak/consistency but stays out of per-day PRs & last-session presets.
  const handleCompleteJustShowUp = useCallback((session: WorkoutSession) => {
    setSessions((prev) => [...prev, session]);
    setShowJustShowUp(false);
    showToast("Showed up — counted it! 💪", "success");
  }, [setSessions, showToast]);

  const logBodyWeight = useCallback((weight: number) => {
    const today = toLocalDateKey();
    setBodyWeightEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [...filtered, { date: today, weight, weightUnit, timezone, recordedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }].sort((a, b) => a.date.localeCompare(b.date));
    });
    showToast("Body weight logged");
  }, [setBodyWeightEntries, showToast, weightUnit, timezone]);

  const handleNoteChange = useCallback((exerciseId: string, note: string) => {
    setExerciseNotes((prev) => ({ ...prev, [exerciseId]: note }));
  }, [setExerciseNotes]);

  const handleSaveWorkoutTemplate = useCallback(
    (nextTemplate: typeof safeWorkoutTemplate) => {
      const applied = applyWorkoutTemplate(nextTemplate, "Workout updated");
      if (applied) setShowWorkoutEditor(false);
    },
    [applyWorkoutTemplate]
  );

  const handleResetWorkoutTemplate = useCallback(() => {
    applyWorkoutTemplate(createDefaultWorkoutTemplate(), "Workout reset to default");
    setShowSettings(false);
  }, [applyWorkoutTemplate]);

  const handleApplyFreeWeightWorkout = useCallback(() => {
    let count = 0;
    const converted = safeWorkoutTemplate.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        const entry = findWikiEntry(exercise.name);
        if (!entry || isFreeWeightFriendly(entry)) return exercise;
        const alt = resolvePrimaryFreeWeightAlternative(entry.name);
        if (!alt || alt === exercise.name) return exercise;
        count++;
        return { ...exercise, id: createWorkoutExerciseId(day.id, alt), name: alt };
      }),
    }));
    if (count === 0) { showToast("Workout is already largely free-weight friendly"); setShowSettings(false); return; }
    applyWorkoutTemplate(converted, "Free-weight-friendly swaps applied");
    setShowSettings(false);
  }, [applyWorkoutTemplate, safeWorkoutTemplate, showToast]);

  const handleStartStretching = useCallback((programId?: string) => {
    setSelectedStretchingProgramId(programId || activeDay.stretchingProgramId || null);
    setActiveTab("stretching");
  }, [activeDay.stretchingProgramId, setSelectedStretchingProgramId, setActiveTab]);

  const handleExport = useCallback(() => {
    const payload = { ...currentSnapshotRef.current, exportedAt: new Date().toISOString(), schemaVersion: 1 };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recomp88-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported");
  }, [showToast]);

  const handleExportCsv = useCallback(() => {
    const escape = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
    const rows = sessions.flatMap((s) => s.exercises.flatMap((ex) => ex.sets.map((set, i) => [
      s.date,
      s.id,
      s.dayName,
      s.duration || "",
      s.bodyWeightSnapshot || "",
      s.totalTonnage || "",
      ex.name,
      i + 1,
      set.setType || "",
      set.targetReps || "",
      set.loggedWeight,
      set.loggedReps,
      set.completed ? "Yes" : "No",
      set.completedAt ? new Date(set.completedAt).toISOString() : "",
      set.rpe || "",
      exerciseNotes[ex.exerciseId] || ""
    ])));
    if (!rows.length) { showToast("No session history to export yet", "error"); return; }
    const headers = [
      "Date", "Session ID", "Day Name", "Duration (s)", "Bodyweight", "Total Tonnage",
      "Exercise", "Set", "Set Type", "Target Reps", "Weight", "Reps",
      "Completed", "Completed At", "RPE", "Notes"
    ];
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recomp88-analytics-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported");
  }, [sessions, exerciseNotes, showToast]);

  const handleExportConfig = useCallback(() => {
    let content = "Workout Configuration:\n\n";
    safeWorkoutTemplate.forEach((day, i) => {
      content += `Day ${i + 1}: ${day.name}\n`;
      content += `------------------------\n`;
      day.exercises.forEach((ex, j) => {
        content += `${j + 1}. ${ex.name} (${ex.sets.length} sets)\n`;
      });
      content += `\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `workout-config-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    showToast("Workout config exported");
  }, [safeWorkoutTemplate, showToast]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rawData = JSON.parse(ev.target?.result as string);
          const data = sanitizeSyncPayload(rawData);
          if (!hasImportableSyncFields(data)) throw new Error("Invalid format");
          const fallback = currentSnapshotRef.current;
          const importedTemplate = data.workoutTemplate ?? fallback.workoutTemplate;
          applySnapshot({
            workoutTemplate: importedTemplate,
            progress: data.progress !== undefined
              ? pruneProgressForWorkoutTemplate(data.progress, importedTemplate)
              : fallback.progress,
            sessions: data.sessions ?? fallback.sessions,
            bodyWeightEntries: data.bodyWeightEntries ?? fallback.bodyWeightEntries,
            exerciseNotes: data.exerciseNotes !== undefined
              ? pruneExerciseNotesForWorkoutTemplate(data.exerciseNotes, importedTemplate)
              : fallback.exerciseNotes,
            customExercises: data.customExercises ?? fallback.customExercises,
            settings: {
              strengthRestDuration: typeof data.settings?.strengthRestDuration === "number" ? data.settings.strengthRestDuration : fallback.settings.strengthRestDuration,
              hypertrophyRestDuration: typeof data.settings?.hypertrophyRestDuration === "number" ? data.settings.hypertrophyRestDuration : fallback.settings.hypertrophyRestDuration,
              soundEnabled: typeof data.settings?.soundEnabled === "boolean" ? data.settings.soundEnabled : fallback.settings.soundEnabled,
              weightUnit: data.settings?.weightUnit === "kg" || data.settings?.weightUnit === "lbs" ? data.settings.weightUnit : fallback.settings.weightUnit,
            },
          });
          setShowSettings(false);
          showToast("Data imported successfully");
        } catch {
          showToast("Failed to parse backup file", "error");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [applySnapshot, showToast]
  );

  const handleClearData = useCallback(() => {
    useAppStore.getState().resetToDefaults();
    restTimer.dismissTimer();
    workoutTimer.reset();
    setShowSettings(false);
    if (isLoggedIn) void pushToCloud({ syncState: useAppStore.getState().syncState, workoutTemplate: createDefaultWorkoutTemplate(), progress: {}, sessions: [], bodyWeightEntries: [], exerciseNotes: {}, settings: { strengthRestDuration: 120, hypertrophyRestDuration: 90, soundEnabled: true, weightUnit: "kg" }, customExercises: [] });
    showToast(isLoggedIn ? "Local data reset; cloud reset queued" : "All data reset");
  }, [isLoggedIn, pushToCloud, restTimer, workoutTimer, showToast]);

  const openExerciseInfo = useCallback((name: string) => {
    const entry = findWikiEntry(name);
    if (entry) setModalEntry(entry);
  }, []);

  const handleSaveCustomExercise = useCallback((ex: ExerciseWiki) => {
    setCustomExercises((prev) => [...prev, ex]);
    showToast(`Saved ${ex.name} to library`);
  }, [setCustomExercises, showToast]);

  const workoutActions = useMemo<WorkoutActions>(() => ({
    toggleSet,
    updateSetData,
    adjustWeight,
    bwFill: handleBwFill,
    loadLastSession,
    openExerciseInfo,
    noteChange: handleNoteChange,
    addExtraSet,
    removeExtraSet,
  }), [toggleSet, updateSetData, adjustWeight, handleBwFill, loadLastSession, openExerciseInfo, handleNoteChange, addExtraSet, removeExtraSet]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-canvas text-neutral-200 font-sans selection:bg-accent-400/30 overflow-hidden relative"
      style={{ ["--bottom-nav-height" as never]: "68px" } as React.CSSProperties}
    >
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,_var(--color-accent-400)_4%,_transparent),transparent_60%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,_var(--color-accent-400)_3%,_transparent),transparent_60%)] pointer-events-none" />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-md mx-auto min-h-dvh bg-neutral-950/50 relative shadow-2xl flex flex-col pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] border-x border-white/4">

        {/* ══ Header (extracted component) ════════════════════════════════ */}
        <AppHeader
          progressPercent={progressPercent}
          isTimerRunning={workoutTimer.isRunning}
          isTimerPaused={workoutTimer.isPaused}
          elapsedSeconds={workoutTimer.elapsedSeconds}
          onTogglePause={workoutTimer.togglePause}
          onResetTimer={handleResetTimer}
          onShowPlateCalc={() => setShowPlateCalc(true)}
          onShowSettings={() => setShowSettings(true)}
        />

        {/* ══ Content ══════════════════════════════════════════════════════ */}
        <main className="flex-1 p-4">
          <ErrorBoundary>
            <div className={activeTab === "dashboard" ? "block" : "hidden"}>
              <DashboardTab onStartStretching={handleStartStretching} onOpenJustShowUp={() => setShowJustShowUp(true)} />
            </div>

            <div className={activeTab === "workout" ? "block" : "hidden"}>
              <WorkoutActionsProvider value={workoutActions}>
                <WorkoutTab
                  activeDay={activeDay}
                  activeDayIndex={clampedActiveDayIndex}
                  totalDays={safeWorkoutTemplate.length}
                  progress={progress}
                  exerciseNotes={exerciseNotes}
                  lastSessionValues={lastSessionValues}
                  allTimePRs={allTimePRs}
                  progressPercent={progressPercent}
                  weightUnit={weightUnit}
                  onSetActiveDayIndex={setActiveDayIndex}
                  onShowFinishConfirm={() => setShowFinishConfirm(true)}
                  onClearCheckmarks={clearCheckmarks}
                  onStartStretching={handleStartStretching}
                  onOpenJustShowUp={() => setShowJustShowUp(true)}
                />
              </WorkoutActionsProvider>
            </div>

            <div className={activeTab === "stretching" ? "block" : "hidden"}>
              <RecoveryTab
                soundEnabled={soundEnabled}
                selectedProgramId={selectedStretchingProgramId}
                onSelectProgram={setSelectedStretchingProgramId}
                onCloseProgram={() => setSelectedStretchingProgramId(null)}
              />
            </div>

            <div className={activeTab === "wiki" ? "block" : "hidden"}>
              <Suspense fallback={<Spinner />}><WikiView /></Suspense>
            </div>

            <div className={activeTab === "charts" ? "block" : "hidden"}>
              <SegmentedControl
                aria-label="Progress view"
                className="mb-4"
                value={progressSubView}
                onChange={setProgressSubView}
                options={[
                  { value: "charts", label: "Progression" },
                  { value: "records", label: "Personal Records" },
                ]}
              />

              {progressSubView === "charts" ? (
                <Suspense fallback={<Spinner />}>
                  <ChartsView
                    workoutTemplate={safeWorkoutTemplate}
                    progress={progress}
                    sessions={sessions}
                    customExercises={customExercises}
                    onOpenExercise={openExerciseInfo}
                    onDeleteSession={deleteSession}
                    bodyWeightEntries={bodyWeightEntries}
                    onLogBodyWeight={logBodyWeight}
                    weightUnit={weightUnit}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<Spinner />}>
                  <ExerciseRecordsView
                    sessions={sessions}
                    bodyWeightEntries={bodyWeightEntries}
                    weightUnit={weightUnit}
                    onOpenExercise={openExerciseInfo}
                  />
                </Suspense>
              )}
            </div>

            <div className={activeTab === "profile" ? "block" : "hidden"}>
              <Suspense fallback={<Spinner />}>
                <ProfileTab
                  sessions={sessions}
                  bodyWeightEntries={bodyWeightEntries}
                  weightUnit={weightUnit}
                  syncStatus={syncStatus}
                  lastSyncedAt={lastSyncedAt}
                  mergeSummary={lastMergeSummary}
                  onDismissMergeSummary={() => setLastMergeSummary(null)}
                  onManualSync={handleManualSync}
                />
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>

        <DayCompleteOverlay show={showDayComplete} dayName={activeDay.name} />

        <RestTimerToast
          restTimer={restTimer.restTimer}
          timerPercent={restTimer.timerPercent}
          restType={restTimer.restType}
          isPaused={restTimer.isPaused}
          onDismiss={restTimer.dismissTimer}
          onTogglePause={restTimer.togglePause}
          onAdjustTimer={restTimer.adjustTimer}
        />

        <InstallPrompt />

        {/* ══ Bottom Nav (extracted component) ════════════════════════════ */}
        <BottomNav />
      </div>

      {/* ══ Modals ═══════════════════════════════════════════════════════ */}
      <GlobalModals
        showFinishConfirm={showFinishConfirm}
        showPlateCalc={showPlateCalc}
        showSettings={showSettings}
        showWorkoutEditor={showWorkoutEditor}
        showAddPastSession={showAddPastSession}
        modalExerciseEntry={modalEntry}
        activeDayName={activeDay.name}
        elapsedSeconds={workoutTimer.elapsedSeconds}
        onFinishWorkout={finishWorkout}
        onCancelFinish={() => setShowFinishConfirm(false)}
        onSetWeightUnit={handleSetWeightUnit}
        onExport={handleExport}
        onExportCsv={handleExportCsv}
        onExportConfig={handleExportConfig}
        onImport={handleImport}
        onOpenWorkoutEditor={() => { setShowSettings(false); setShowWorkoutEditor(true); }}
        onOpenAddPastSession={() => setShowAddPastSession(true)}
        onApplyFreeWeightWorkout={handleApplyFreeWeightWorkout}
        onResetWorkoutTemplate={handleResetWorkoutTemplate}
        onClearData={handleClearData}
        onCloseSettings={() => setShowSettings(false)}
        onSaveWorkoutTemplate={handleSaveWorkoutTemplate}
        onSaveCustomExercise={handleSaveCustomExercise}
        onCloseWorkoutEditor={() => setShowWorkoutEditor(false)}
        onAddPastSessions={handleAddPastSessions}
        onCloseAddPastSession={() => setShowAddPastSession(false)}
        onCloseExerciseDetail={() => setModalEntry(null)}
        onClosePlateCalc={() => setShowPlateCalc(false)}
      />

      {showJustShowUp && (
        <JustShowUpModal
          dayName={activeDay?.name ?? ""}
          exercises={activeDay?.exercises ?? []}
          onComplete={handleCompleteJustShowUp}
          onClose={() => setShowJustShowUp(false)}
        />
      )}
    </div>
  );
}

/**
 * The page imports this component with `ssr: false`, so hydrate the external
 * store before any Zustand subscriber mounts.
 */
export default function App() {
  hydrateStoreFromStorage();
  return <AppMain />;
}
