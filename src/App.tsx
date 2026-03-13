'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import {
  createDefaultWorkoutTemplate,
  mergeWorkoutProgress,
  normalizeWorkoutTemplate,
  pruneExerciseNotesForWorkoutTemplate,
  pruneProgressForWorkoutTemplate,
} from "./data";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useToast } from "./hooks/useToast";
import { useRestTimer } from "./hooks/useRestTimer";
import { useWorkoutTimer } from "./hooks/useWorkoutTimer";
import { useCloudSync } from "./hooks/useCloudSync";
import type {
  AppDataSnapshot,
  WorkoutProgress,
  SessionHistory,
  WorkoutSession,
  BodyWeightEntry,
  WorkoutTemplate as WorkoutTemplateData,
} from "./types";
import { cn, formatTime, getClosestBodyWeight, resolveWeight } from "./utils";
import {
  findWikiEntry,
  isFreeWeightFriendly,
  resolvePrimaryFreeWeightAlternative,
} from "./wikiData";
import type { ExerciseWiki } from "./wikiData";
import { Dumbbell, BookOpen, BarChart3, Settings, Calculator, Clock, Play, RotateCcw, UserCircle2, Timer } from "lucide-react";

import ErrorBoundary from "./components/ErrorBoundary";
import ExerciseDetailModal from "./components/ExerciseDetailModal";
import PlateCalculator from "./components/PlateCalculator";
import WorkoutTab from "./components/WorkoutTab";
import StretchingTab from "./components/StretchingTab";
import RestTimerToast from "./components/RestTimerToast";
import DayCompleteOverlay from "./components/DayCompleteOverlay";
import FinishConfirmModal from "./components/FinishConfirmModal";
import SettingsModal from "./components/SettingsModal";
import WorkoutEditorModal from "./components/WorkoutEditorModal";
import ToastContainer from "./components/ui/ToastContainer";
import InstallPrompt from "./components/InstallPrompt";

const WikiView = lazy(() => import("./components/WikiView"));
const ChartsView = lazy(() => import("./components/ChartsView"));
const ProfileTab = lazy(() => import("./components/ProfileTab"));

type TabId = "workout" | "stretching" | "wiki" | "charts" | "profile";

const APP_STORAGE_KEYS = [
  "recomp88-workout-template",
  "recomp88-progress",
  "recomp88-sessions",
  "recomp88-strength-rest",
  "recomp88-hypertrophy-rest",
  "recomp88-notes",
  "recomp88-sound",
  "recomp88-bodyweight",
  "recomp88-weight-unit",
  "recomp88-rest-state",
  "recomp88-timer-start",
  "recomp88-timer-paused",
  "recomp88-pwa-dismissed",
] as const;

const DEFAULT_SETTINGS = {
  strengthRestDuration: 120,
  hypertrophyRestDuration: 90,
  soundEnabled: true,
  weightUnit: "kg" as const,
};

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

const mergeSessions = (localSessions: SessionHistory, cloudSessions: SessionHistory): SessionHistory => {
  const merged = new Map<string, WorkoutSession>();

  [...cloudSessions, ...localSessions].forEach((session) => {
    if (!session?.id) return;
    merged.set(session.id, session);
  });

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  );
};

const mergeBodyWeightEntries = (
  localEntries: BodyWeightEntry[],
  cloudEntries: BodyWeightEntry[]
): BodyWeightEntry[] => {
  const merged = new Map<string, BodyWeightEntry>();

  [...cloudEntries, ...localEntries].forEach((entry) => {
    if (!entry?.date || typeof entry.weight !== "number") return;
    merged.set(entry.date, entry);
  });

  return Array.from(merged.values()).sort((left, right) => left.date.localeCompare(right.date));
};

export default function App() {
  const defaultWorkoutTemplate = useMemo(() => createDefaultWorkoutTemplate(), []);
  const [activeTab, setActiveTab] = useState<TabId>("workout");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // ─── Persisted state ─────────────────────────────────────────────────────
  const [workoutTemplate, setWorkoutTemplate] = useLocalStorage<WorkoutTemplateData>(
    "recomp88-workout-template",
    defaultWorkoutTemplate
  );
  const [progress, setProgress] = useLocalStorage<WorkoutProgress>("recomp88-progress", {});
  const [sessions, setSessions] = useLocalStorage<SessionHistory>("recomp88-sessions", []);
  const [strengthRestDuration, setStrengthRestDuration] = useLocalStorage<number>(
    "recomp88-strength-rest",
    DEFAULT_SETTINGS.strengthRestDuration
  );
  const [hypertrophyRestDuration, setHypertrophyRestDuration] = useLocalStorage<number>(
    "recomp88-hypertrophy-rest",
    DEFAULT_SETTINGS.hypertrophyRestDuration
  );
  const [exerciseNotes, setExerciseNotes] = useLocalStorage<Record<string, string>>("recomp88-notes", {});
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>(
    "recomp88-sound",
    DEFAULT_SETTINGS.soundEnabled
  );
  const [bodyWeightEntries, setBodyWeightEntries] = useLocalStorage<BodyWeightEntry[]>("recomp88-bodyweight", []);
  const [weightUnit, setWeightUnit] = useLocalStorage<"kg" | "lbs">(
    "recomp88-weight-unit",
    DEFAULT_SETTINGS.weightUnit
  );

  // ─── Cloud sync ──────────────────────────────────────────────────────────
  const { isLoggedIn, fetchCloudData, schedulePush, pushToCloud, syncStatus, lastSyncedAt } = useCloudSync();
  const cloudBootstrapped = useRef(false);
  const [canPushCloud, setCanPushCloud] = useState(false);

  // ─── Hooks ─────────────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast();
  const restTimer = useRestTimer({
    soundEnabled,
    strengthDuration: strengthRestDuration,
    hypertrophyDuration: hypertrophyRestDuration,
  });
  const workoutTimer = useWorkoutTimer();

  // ─── Ephemeral state ──────────────────────────────────────────────────────
  const [modalEntry, setModalEntry] = useState<ExerciseWiki | null>(null);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkoutEditor, setShowWorkoutEditor] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [selectedStretchingProgramId, setSelectedStretchingProgramId] = useState<string | null>(null);

  const safeWorkoutTemplate = useMemo(
    () => normalizeWorkoutTemplate(workoutTemplate) ?? defaultWorkoutTemplate,
    [defaultWorkoutTemplate, workoutTemplate]
  );
  const clampedActiveDayIndex = Math.min(activeDayIndex, Math.max(safeWorkoutTemplate.length - 1, 0));
  const activeDay = safeWorkoutTemplate[clampedActiveDayIndex];

  useEffect(() => {
    const serializedCurrent = JSON.stringify(workoutTemplate);
    const serializedSafe = JSON.stringify(safeWorkoutTemplate);
    if (serializedCurrent !== serializedSafe) {
      setWorkoutTemplate(safeWorkoutTemplate);
    }
  }, [safeWorkoutTemplate, setWorkoutTemplate, workoutTemplate]);

  useEffect(() => {
    if (activeDayIndex !== clampedActiveDayIndex) {
      setActiveDayIndex(clampedActiveDayIndex);
    }
  }, [activeDayIndex, clampedActiveDayIndex]);

  const applyWorkoutTemplate = useCallback(
    (nextWorkoutTemplate: WorkoutTemplateData, successMessage?: string) => {
      const normalizedTemplate = normalizeWorkoutTemplate(nextWorkoutTemplate);
      if (!normalizedTemplate) {
        showToast("Invalid workout template", "error");
        return null;
      }

      setWorkoutTemplate(normalizedTemplate);
      setProgress((previousProgress) =>
        pruneProgressForWorkoutTemplate(previousProgress, normalizedTemplate)
      );
      setExerciseNotes((previousNotes) =>
        pruneExerciseNotesForWorkoutTemplate(previousNotes, normalizedTemplate)
      );
      setActiveDayIndex((currentIndex) =>
        Math.min(currentIndex, Math.max(normalizedTemplate.length - 1, 0))
      );

      if (successMessage) {
        showToast(successMessage);
      }

      return normalizedTemplate;
    },
    [setExerciseNotes, setProgress, setWorkoutTemplate, showToast]
  );

  // ─── Bootstrap cloud data on login ────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      cloudBootstrapped.current = false;
      setCanPushCloud(false);
      return;
    }

    if (cloudBootstrapped.current) return;

    cloudBootstrapped.current = true;
    let cancelled = false;

    fetchCloudData()
      .then((data) => {
        if (!data || cancelled) return;

        const nextWorkoutTemplate =
          normalizeWorkoutTemplate(data.workoutTemplate) ?? safeWorkoutTemplate;

        setWorkoutTemplate(nextWorkoutTemplate);
        setProgress((previousProgress) =>
          pruneProgressForWorkoutTemplate(
            mergeWorkoutProgress(data.progress ?? {}, previousProgress),
            nextWorkoutTemplate
          )
        );
        setSessions((previousSessions) => mergeSessions(previousSessions, data.sessions ?? []));
        setBodyWeightEntries((previousEntries) =>
          mergeBodyWeightEntries(previousEntries, data.bodyWeightEntries ?? [])
        );
        setExerciseNotes((previousNotes) =>
          pruneExerciseNotesForWorkoutTemplate(
            { ...(data.exerciseNotes ?? {}), ...previousNotes },
            nextWorkoutTemplate
          )
        );

        if (data.settings) {
          if (typeof data.settings.strengthRestDuration === "number") {
            setStrengthRestDuration(() => data.settings.strengthRestDuration);
          }
          if (typeof data.settings.hypertrophyRestDuration === "number") {
            setHypertrophyRestDuration(() => data.settings.hypertrophyRestDuration);
          }
          if (typeof data.settings.soundEnabled === "boolean") {
            setSoundEnabled(() => data.settings.soundEnabled);
          }
          if (data.settings.weightUnit === "kg" || data.settings.weightUnit === "lbs") {
            setWeightUnit(() => data.settings.weightUnit);
          }
        }

        showToast("Cloud data loaded");
      })
      .finally(() => {
        if (!cancelled) {
          setCanPushCloud(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    fetchCloudData,
    isLoggedIn,
    safeWorkoutTemplate,
    setBodyWeightEntries,
    setExerciseNotes,
    setHypertrophyRestDuration,
    setProgress,
    setSessions,
    setSoundEnabled,
    setStrengthRestDuration,
    setWeightUnit,
    setWorkoutTemplate,
    showToast,
  ]);

  // ─── Auto-push on data change ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !canPushCloud) return;
    schedulePush({
      workoutTemplate: safeWorkoutTemplate,
      progress,
      sessions,
      bodyWeightEntries,
      exerciseNotes,
      settings: { strengthRestDuration, hypertrophyRestDuration, soundEnabled, weightUnit },
    });
  }, [
    bodyWeightEntries,
    canPushCloud,
    exerciseNotes,
    hypertrophyRestDuration,
    isLoggedIn,
    progress,
    safeWorkoutTemplate,
    schedulePush,
    sessions,
    soundEnabled,
    strengthRestDuration,
    weightUnit,
  ]);

  const handleManualSync = useCallback(() => {
    pushToCloud({
      workoutTemplate: safeWorkoutTemplate,
      progress,
      sessions,
      bodyWeightEntries,
      exerciseNotes,
      settings: { strengthRestDuration, hypertrophyRestDuration, soundEnabled, weightUnit },
    });
  }, [
    bodyWeightEntries,
    exerciseNotes,
    hypertrophyRestDuration,
    progress,
    pushToCloud,
    safeWorkoutTemplate,
    sessions,
    soundEnabled,
    strengthRestDuration,
    weightUnit,
  ]);

  // For undo support - stores refs for the undo callback in toast
  const prevProgressPercent = useRef<number>(0);

  // ─── PR computation ───────────────────────────────────────────────────────
  const allTimePRs = useMemo(() => {
    const prs: Record<string, number> = {};
    const defaultBw = weightUnit === "lbs" ? 175 : 80;

    safeWorkoutTemplate.forEach((day) => {
      day.exercises.forEach((exercise) => {
        let bestWeight = 0;

        sessions
          .filter((session) => session.dayId === day.id)
          .forEach((session) => {
            const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
            session.exercises
              .filter(
                (sessionExercise) =>
                  sessionExercise.exerciseId === exercise.id ||
                  sessionExercise.name === exercise.name
              )
              .forEach((sessionExercise) => {
                sessionExercise.sets.forEach((set) => {
                  const resolvedWeight = resolveWeight(set.loggedWeight, bw);
                  if (resolvedWeight > bestWeight) {
                    bestWeight = resolvedWeight;
                  }
                });
              });
          });

        prs[exercise.id] = bestWeight;
      });
    });

    return prs;
  }, [bodyWeightEntries, safeWorkoutTemplate, sessions, weightUnit]);

  // ─── Last session values per day/exercise/set ─────────────────────────────
  const lastSessionValues = useMemo(() => {
    const values: Record<string, Record<string, Record<string, { weight: string; reps: string }>>> = {};

    safeWorkoutTemplate.forEach((day) => {
      const daySessions = sessions
        .filter((session) => session.dayId === day.id)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

      if (daySessions.length === 0) return;

      values[day.id] = {};
      day.exercises.forEach((exercise) => {
        const matchingSessionExercise = daySessions
          .flatMap((session) => session.exercises)
          .find(
            (sessionExercise) =>
              sessionExercise.exerciseId === exercise.id ||
              sessionExercise.name === exercise.name
          );

        if (!matchingSessionExercise) return;

        values[day.id][exercise.id] = {};
        exercise.sets.forEach((set, setIndex) => {
          const previousSet = matchingSessionExercise.sets[setIndex];
          if (!previousSet) return;

          values[day.id][exercise.id][set.id] = {
            weight: previousSet.loggedWeight,
            reps: previousSet.loggedReps,
          };
        });
      });
    });

    return values;
  }, [safeWorkoutTemplate, sessions]);

  // ─── Day progress % (now properly memoized) ──────────────────────────────
  const progressPercent = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    activeDay.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      ex.sets.forEach((set) => {
        if (progress[activeDay.id]?.[ex.id]?.[set.id]?.completed) completedSets++;
      });
    });
    return totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  }, [progress, activeDay]);

  // Day complete overlay trigger
  useEffect(() => {
    if (progressPercent === 100 && prevProgressPercent.current < 100) {
      setShowDayComplete(true);
      if ("vibrate" in navigator) navigator.vibrate([50, 30, 80]);
      const t = setTimeout(() => setShowDayComplete(false), 3000);
      return () => clearTimeout(t);
    }
    prevProgressPercent.current = progressPercent;
  }, [progressPercent]);

  // ─── Set actions ─────────────────────────────────────────────────────────
  const toggleSet = useCallback(
    (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => {
      const isCompleted = progress[dayId]?.[exerciseId]?.[setId]?.completed || false;
      setProgress((prev) => {
        const dayProgress = prev[dayId] || {};
        const exProgress = dayProgress[exerciseId] || {};
        const setProgress = exProgress[setId] || { completed: false, loggedWeight: "", loggedReps: "" };
        return {
          ...prev,
          [dayId]: {
            ...dayProgress,
            [exerciseId]: {
              ...exProgress,
              [setId]: { ...setProgress, completed: !isCompleted }
            }
          }
        };
      });
      if (!isCompleted) {
        if ("vibrate" in navigator) navigator.vibrate(50);
        workoutTimer.start();
        if (restType !== "other") {
          restTimer.startTimer(restType as "strength" | "hypertrophy");
        }
      }
    },
    [progress, setProgress, workoutTimer, restTimer]
  );

  const updateSetData = useCallback(
    (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps", value: string) => {
      setProgress((prev) => {
        const dayProgress = prev[dayId] || {};
        const exProgress = dayProgress[exerciseId] || {};
        const setProgress = exProgress[setId] || { completed: false, loggedWeight: "", loggedReps: "" };
        return {
          ...prev,
          [dayId]: {
            ...dayProgress,
            [exerciseId]: {
              ...exProgress,
              [setId]: { ...setProgress, [field]: value }
            }
          }
        };
      });
    },
    [setProgress]
  );

  const adjustWeight = useCallback(
    (exerciseId: string, setId: string, delta: number) => {
      const currentVal = progress[activeDay.id]?.[exerciseId]?.[setId]?.loggedWeight || "";
      if (currentVal.startsWith("BW")) {
        const offsetStr = currentVal.replace("BW", "").replace("+", "");
        const currentNum = offsetStr ? parseFloat(offsetStr) : 0;
        const next = Math.round((currentNum + delta) * 100) / 100;
        const newVal = next === 0 ? "BW" : (next > 0 ? `BW+${next}` : `BW${next}`);
        updateSetData(activeDay.id, exerciseId, setId, "loggedWeight", newVal);
        return;
      }
      const currentNum = parseFloat(currentVal);
      const base = isNaN(currentNum) ? 0 : currentNum;
      const next = Math.max(0, Math.round((base + delta) * 100) / 100);
      updateSetData(activeDay.id, exerciseId, setId, "loggedWeight", next > 0 ? String(next) : "");
    },
    [progress, activeDay.id, updateSetData]
  );

  const handleBwFill = useCallback(
    (exerciseId: string) => {
      const exercise = activeDay.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      const allBw = exercise.sets.every(
        (set) => (progress[activeDay.id]?.[exercise.id]?.[set.id]?.loggedWeight ?? "") === "BW"
      );
      const newValue = allBw ? "" : "BW";
      setProgress((prev) => {
        const dayProgress = prev[activeDay.id] || {};
        const exProgress = dayProgress[exerciseId] || {};
        const newExProgress = { ...exProgress };
        exercise.sets.forEach((set) => {
          const setProgress = newExProgress[set.id] || { completed: false, loggedWeight: "", loggedReps: "" };
          newExProgress[set.id] = { ...setProgress, loggedWeight: newValue };
        });
        return {
          ...prev,
          [activeDay.id]: {
            ...dayProgress,
            [exerciseId]: newExProgress
          }
        };
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
        const dayProgress = prev[activeDay.id] || {};
        const exProgress = dayProgress[exerciseId] || {};
        const newExProgress = { ...exProgress };
        exercise.sets.forEach((set) => {
          const vals = lastVals[set.id];
          if (vals) {
            const setProgress = newExProgress[set.id] || { completed: false, loggedWeight: "", loggedReps: "" };
            newExProgress[set.id] = { ...setProgress, loggedWeight: vals.weight, loggedReps: vals.reps };
          }
        });
        return {
          ...prev,
          [activeDay.id]: {
            ...dayProgress,
            [exerciseId]: newExProgress
          }
        };
      });
      showToast("Loaded last session");
    },
    [activeDay, lastSessionValues, setProgress, showToast]
  );

  // ─── Finish workout with undo ─────────────────────────────────────────────
  const finishWorkout = useCallback(() => {
    const previousProgress = structuredClone(progress);
    const dayProgress = progress[activeDay.id];
    let addedSessionId = "";

    if (dayProgress) {
      const hasData = activeDay.exercises.some((ex) =>
        ex.sets.some((set) => {
          const s = dayProgress[ex.id]?.[set.id];
          return s && (s.loggedWeight || s.loggedReps || s.completed);
        })
      );
      if (hasData) {
        const duration = workoutTimer.getDuration();
        const session: WorkoutSession = {
          id: `${activeDay.id}-${Date.now()}`,
          date: new Date().toISOString(),
          dayId: activeDay.id,
          dayName: activeDay.name,
          duration,
          exercises: activeDay.exercises
            .map((ex) => ({
              exerciseId: ex.id,
              name: ex.name,
              type: ex.type,
              sets: ex.sets
                .map((set) => {
                  const s = dayProgress[ex.id]?.[set.id];
                  return {
                    setId: set.id,
                    loggedWeight: s?.loggedWeight || "",
                    loggedReps: s?.loggedReps || "",
                    completed: s?.completed || false,
                  };
                })
                .filter((s) => s.loggedWeight || s.loggedReps || (ex.type === "other" && s.completed)),
            }))
            .filter((ex) => ex.sets.length > 0),
        };
        addedSessionId = session.id;
        setSessions((prev) => [...prev, session]);
      }
    }

    // Clear checkmarks but keep weights/reps
    setProgress((prev) => {
      const dayProgress = prev[activeDay.id];
      if (!dayProgress) return prev;

      const newDayProgress = { ...dayProgress };
      Object.keys(newDayProgress).forEach((exId) => {
        newDayProgress[exId] = { ...newDayProgress[exId] };
        Object.keys(newDayProgress[exId]).forEach((setId) => {
          newDayProgress[exId][setId] = { ...newDayProgress[exId][setId], completed: false };
        });
      });
      return { ...prev, [activeDay.id]: newDayProgress };
    });

    restTimer.dismissTimer();
    workoutTimer.reset();
    setShowFinishConfirm(false);

    // Undo data is captured in the toast callback closure below
    showToast(
      `${activeDay.name} saved!`,
      "success",
      addedSessionId
        ? () => {
          // Undo: restore progress and remove session
          setProgress(previousProgress);
          setSessions((prev) => prev.filter((s) => s.id !== addedSessionId));
          showToast("Workout restored");
        }
        : undefined
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [progress, activeDay, workoutTimer, restTimer, setProgress, setSessions, showToast]);

  // ─── Reset workout timer (without finishing) ──────────────────────────────
  const handleResetTimer = useCallback(() => {
    workoutTimer.reset();
    showToast("Timer reset");
  }, [workoutTimer, showToast]);

  // ─── Delete session ───────────────────────────────────────────────────────
  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showToast("Session deleted");
    },
    [setSessions, showToast]
  );

  // ─── Body weight ──────────────────────────────────────────────────────────
  const logBodyWeight = useCallback(
    (weight: number) => {
      const today = new Date().toISOString().slice(0, 10);
      setBodyWeightEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== today);
        return [...filtered, { date: today, weight }].sort((a, b) => a.date.localeCompare(b.date));
      });
      showToast("Body weight logged");
    },
    [setBodyWeightEntries, showToast]
  );

  // ─── Note change ───────────────────────────────────────────────────────────
  const handleNoteChange = useCallback(
    (exerciseId: string, note: string) => {
      setExerciseNotes((prev) => ({ ...prev, [exerciseId]: note }));
    },
    [setExerciseNotes]
  );

  const handleSaveWorkoutTemplate = useCallback(
    (nextWorkoutTemplate: WorkoutTemplateData) => {
      const appliedTemplate = applyWorkoutTemplate(nextWorkoutTemplate, "Workout updated");
      if (!appliedTemplate) return;

      setShowWorkoutEditor(false);
    },
    [applyWorkoutTemplate]
  );

  const handleResetWorkoutTemplate = useCallback(() => {
    const defaultTemplate = createDefaultWorkoutTemplate();
    applyWorkoutTemplate(defaultTemplate, "Workout reset to default");
    setShowSettings(false);
  }, [applyWorkoutTemplate]);

  const handleApplyFreeWeightWorkout = useCallback(() => {
    let replacementCount = 0;
    const convertedTemplate = safeWorkoutTemplate.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        const entry = findWikiEntry(exercise.name);
        if (!entry || isFreeWeightFriendly(entry)) return exercise;

        const freeWeightAlternative = resolvePrimaryFreeWeightAlternative(entry.name);
        if (!freeWeightAlternative || freeWeightAlternative === exercise.name) {
          return exercise;
        }

        replacementCount += 1;

        return {
          ...exercise,
          id: createWorkoutExerciseId(day.id, freeWeightAlternative),
          name: freeWeightAlternative,
        };
      }),
    }));

    if (replacementCount === 0) {
      showToast("Workout is already largely free-weight friendly");
      setShowSettings(false);
      return;
    }

    applyWorkoutTemplate(
      convertedTemplate,
      "Free-weight-friendly swaps applied"
    );
    setShowSettings(false);
  }, [applyWorkoutTemplate, safeWorkoutTemplate, showToast]);

  const handleStartStretching = useCallback(() => {
    setSelectedStretchingProgramId(activeDay.stretchingProgramId ?? null);
    setActiveTab("stretching");
  }, [activeDay.stretchingProgramId]);

  // ─── Export / Import (now includes workout template) ──────────────────────
  const handleExport = useCallback(() => {
    const snapshot: AppDataSnapshot & { exportedAt: string; schemaVersion: number } = {
      workoutTemplate: safeWorkoutTemplate,
      progress,
      sessions,
      bodyWeightEntries,
      exerciseNotes,
      settings: {
        strengthRestDuration,
        hypertrophyRestDuration,
        soundEnabled,
        weightUnit,
      },
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
    };

    const blob = new Blob(
      [
        JSON.stringify(snapshot, null, 2),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recomp88-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported");
  }, [
    bodyWeightEntries,
    exerciseNotes,
    hypertrophyRestDuration,
    progress,
    safeWorkoutTemplate,
    sessions,
    showToast,
    soundEnabled,
    strengthRestDuration,
    weightUnit,
  ]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Partial<AppDataSnapshot>;
          if (typeof data !== "object" || data === null) throw new Error("Invalid format");

          const importedWorkoutTemplate =
            normalizeWorkoutTemplate(data.workoutTemplate) ?? safeWorkoutTemplate;

          setWorkoutTemplate(importedWorkoutTemplate);

          if (data.progress && typeof data.progress === "object") {
            setProgress(pruneProgressForWorkoutTemplate(data.progress as WorkoutProgress, importedWorkoutTemplate));
          }
          if (data.sessions && Array.isArray(data.sessions)) {
            setSessions(data.sessions);
          }
          if (data.bodyWeightEntries && Array.isArray(data.bodyWeightEntries)) {
            setBodyWeightEntries(data.bodyWeightEntries);
          }
          if (data.exerciseNotes && typeof data.exerciseNotes === "object") {
            setExerciseNotes(
              pruneExerciseNotesForWorkoutTemplate(
                data.exerciseNotes as Record<string, string>,
                importedWorkoutTemplate
              )
            );
          }
          const importedSettings = data.settings;
          if (importedSettings && typeof importedSettings === "object") {
            if (typeof importedSettings.strengthRestDuration === "number") {
              setStrengthRestDuration(() => importedSettings.strengthRestDuration);
            }
            if (typeof importedSettings.hypertrophyRestDuration === "number") {
              setHypertrophyRestDuration(() => importedSettings.hypertrophyRestDuration);
            }
            if (typeof importedSettings.soundEnabled === "boolean") {
              setSoundEnabled(() => importedSettings.soundEnabled);
            }
            if (importedSettings.weightUnit === "kg" || importedSettings.weightUnit === "lbs") {
              setWeightUnit(() => importedSettings.weightUnit);
            }
          }
          setActiveDayIndex((currentIndex) =>
            Math.min(currentIndex, Math.max(importedWorkoutTemplate.length - 1, 0))
          );
          setShowSettings(false);
          showToast("Data imported successfully");
        } catch {
          showToast("Failed to parse backup file", "error");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [
      safeWorkoutTemplate,
      setBodyWeightEntries,
      setExerciseNotes,
      setHypertrophyRestDuration,
      setProgress,
      setSessions,
      setSoundEnabled,
      setStrengthRestDuration,
      setWeightUnit,
      setWorkoutTemplate,
      showToast,
    ]
  );

  const handleClearData = useCallback(() => {
    const resetWorkoutTemplate = createDefaultWorkoutTemplate();
    const emptySnapshot: AppDataSnapshot = {
      workoutTemplate: resetWorkoutTemplate,
      progress: {},
      sessions: [],
      bodyWeightEntries: [],
      exerciseNotes: {},
      settings: { ...DEFAULT_SETTINGS },
    };

    APP_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    setWorkoutTemplate(resetWorkoutTemplate);
    setProgress({});
    setSessions([]);
    setBodyWeightEntries([]);
    setExerciseNotes({});
    setStrengthRestDuration(() => DEFAULT_SETTINGS.strengthRestDuration);
    setHypertrophyRestDuration(() => DEFAULT_SETTINGS.hypertrophyRestDuration);
    setSoundEnabled(() => DEFAULT_SETTINGS.soundEnabled);
    setWeightUnit(() => DEFAULT_SETTINGS.weightUnit);
    setActiveDayIndex(0);
    restTimer.dismissTimer();
    workoutTimer.reset();
    setShowSettings(false);

    if (isLoggedIn) {
      void pushToCloud(emptySnapshot);
    }

    showToast("All data reset");
  }, [
    isLoggedIn,
    pushToCloud,
    restTimer,
    setBodyWeightEntries,
    setExerciseNotes,
    setHypertrophyRestDuration,
    setProgress,
    setSessions,
    setSoundEnabled,
    setStrengthRestDuration,
    setWeightUnit,
    setWorkoutTemplate,
    showToast,
    workoutTimer,
  ]);

  const openExerciseInfo = useCallback((exerciseName: string) => {
    const entry = findWikiEntry(exerciseName);
    if (entry) setModalEntry(entry);
  }, []);

  const tabs = [
    { id: "workout" as TabId, label: "Tracker", icon: Dumbbell },
    { id: "stretching" as TabId, label: "Stretch", icon: Timer },
    { id: "wiki" as TabId, label: "Wiki", icon: BookOpen },
    { id: "charts" as TabId, label: "Progress", icon: BarChart3 },
    { id: "profile" as TabId, label: "Profile", icon: UserCircle2 },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#080808] text-neutral-200 font-sans selection:bg-lime-400/30 overflow-hidden relative"
      style={
        {
          // Used to reserve space for the fixed bottom navigation.
          // Keep in sync with the bar's actual non-safe-area height.
          ["--bottom-nav-height" as never]: "68px",
        } as React.CSSProperties
      }
    >
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(163,230,53,0.04),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(163,230,53,0.03),transparent_60%)] pointer-events-none" />

      {/* ═══ Toast Notifications ═══ */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-md mx-auto min-h-dvh bg-neutral-950/50 relative shadow-2xl flex flex-col pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] border-x border-white/4">
        {/* ═══ Sticky Header ═══ */}
        <header className="sticky top-0 z-40 bg-[#080808]/80 backdrop-blur-2xl border-b border-white/6 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-lime-400">Recomp</h1>
              <span className="text-2xl font-black uppercase tracking-[0.12em] text-white/90">88</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "workout" && (workoutTimer.isRunning || workoutTimer.isPaused) && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={workoutTimer.togglePause}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95",
                      workoutTimer.isPaused ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : "bg-white/5 border-white/8 text-lime-400 hover:bg-white/10"
                    )}
                    aria-label={workoutTimer.isPaused ? "Resume workout" : "Pause workout"}
                  >
                    {workoutTimer.isPaused ? <Play size={12} className="text-amber-400" /> : <Clock size={12} className="text-lime-400" />}
                    <span className={cn("text-[11px] font-mono font-bold tabular-nums", workoutTimer.isPaused ? "text-amber-400" : "text-lime-400")}>
                      {formatTime(workoutTimer.elapsedSeconds)}
                    </span>
                  </button>
                  <button
                    onClick={handleResetTimer}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all active:scale-90"
                    aria-label="Reset workout timer"
                    title="Reset timer"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              )}
              {activeTab === "workout" && (
                <button
                  onClick={() => setShowPlateCalc(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-lime-400 hover:bg-lime-400/10 hover:border-lime-400/20 transition-all"
                  aria-label="Open plate calculator"
                >
                  <Calculator size={15} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-neutral-300 hover:bg-white/8 transition-all"
                aria-label="Open settings"
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          {activeTab === "workout" && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-white/6 h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)] transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums shrink-0">
                  {progressPercent}%
                </span>
              </div>

              <div className="flex overflow-x-auto gap-1.5 scrollbar-none snap-x -mx-0.5 px-0.5" role="tablist" aria-label="Workout days">
                {safeWorkoutTemplate.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayIndex(idx)}
                    role="tab"
                    aria-selected={clampedActiveDayIndex === idx}
                    className={cn(
                      "snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 border",
                      clampedActiveDayIndex === idx
                        ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.25)]"
                        : "bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300"
                    )}
                  >
                    D{day.dayNumber}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">
                  {activeDay.name}
                </p>
                <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest">
                  swipe to change day
                </p>
              </div>
            </>
          )}
        </header>

        {/* ═══ Content ═══ */}
        <main className="flex-1 p-4">
          <ErrorBoundary>
            <div className={activeTab === "workout" ? "block" : "hidden"}>
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
                onToggleSet={toggleSet}
                onUpdateSetData={updateSetData}
                onAdjustWeight={adjustWeight}
                onBwFill={handleBwFill}
                onLoadLastSession={loadLastSession}
                onOpenExerciseInfo={openExerciseInfo}
                onNoteChange={handleNoteChange}
                onShowFinishConfirm={() => setShowFinishConfirm(true)}
                onStartStretching={handleStartStretching}
              />
            </div>

            <div className={activeTab === "stretching" ? "block" : "hidden"}>
              <StretchingTab
                soundEnabled={soundEnabled}
                selectedProgramId={selectedStretchingProgramId}
                onSelectProgram={setSelectedStretchingProgramId}
                onCloseProgram={() => setSelectedStretchingProgramId(null)}
              />
            </div>

            <div className={activeTab === "wiki" ? "block" : "hidden"}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                  </div>
                }
              >
                <WikiView />
              </Suspense>
            </div>

            <div className={activeTab === "charts" ? "block" : "hidden"}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                  </div>
                }
              >
                <ChartsView
                  workoutTemplate={safeWorkoutTemplate}
                  progress={progress}
                  sessions={sessions}
                  onOpenExercise={openExerciseInfo}
                  onDeleteSession={deleteSession}
                  bodyWeightEntries={bodyWeightEntries}
                  onLogBodyWeight={logBodyWeight}
                  weightUnit={weightUnit}
                />
              </Suspense>
            </div>

            <div className={activeTab === "profile" ? "block" : "hidden"}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                  </div>
                }
              >
                <ProfileTab
                  sessions={sessions}
                  bodyWeightEntries={bodyWeightEntries}
                  weightUnit={weightUnit}
                  syncStatus={syncStatus}
                  lastSyncedAt={lastSyncedAt}
                  onManualSync={handleManualSync}
                />
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>

        {/* ═══ Day Complete Overlay ═══ */}
        <DayCompleteOverlay show={showDayComplete} dayName={activeDay.name} />

        {/* ═══ Rest Timer Toast ═══ */}
        <RestTimerToast
          restTimer={restTimer.restTimer}
          timerPercent={restTimer.timerPercent}
          restType={restTimer.restType}
          isPaused={restTimer.isPaused}
          onDismiss={restTimer.dismissTimer}
          onTogglePause={restTimer.togglePause}
        />

        {/* ═══ Desktop/Mobile PWA Install Prompt ═══ */}
        <InstallPrompt />

        {/* ═══ Bottom Navigation ═══ */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-50">
          <div className="pointer-events-auto bg-[#080808]/88 backdrop-blur-2xl border-t border-white/6 shadow-[0_-10px_40px_rgba(0,0,0,0.55)] px-2 pb-[env(safe-area-inset-bottom)]">
            <div className="h-[var(--bottom-nav-height)] flex items-center justify-center">
              <nav className="grid grid-cols-5 w-full gap-0.5" aria-label="Main navigation">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTab(id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-[2px] rounded-2xl transition-all duration-200 py-1.5",
                      "min-h-[52px] min-w-0 select-none outline-none",
                      "focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]",
                      isActive ? "text-lime-400" : "text-neutral-600 hover:text-neutral-300"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div
                      className={cn(
                        "w-9 h-8 flex items-center justify-center rounded-2xl transition-all duration-200 border",
                        isActive
                          ? "bg-lime-400/12 border-lime-400/25 shadow-[0_0_18px_rgba(163,230,53,0.14)]"
                          : "border-transparent group-hover:bg-white/4"
                      )}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      className={cn(
                        "text-[8px] uppercase font-bold tracking-[0.1em] leading-none transition-colors truncate w-full text-center px-0.5",
                        isActive ? "text-lime-400" : "text-neutral-600 group-hover:text-neutral-400"
                      )}
                    >
                      {label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full transition-opacity",
                        "bg-lime-400/80 shadow-[0_0_10px_rgba(163,230,53,0.45)]",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </button>
                );
              })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Modals ═══ */}
      {showFinishConfirm && (
        <FinishConfirmModal
          dayName={activeDay.name}
          elapsedSeconds={workoutTimer.elapsedSeconds}
          onConfirm={finishWorkout}
          onCancel={() => setShowFinishConfirm(false)}
        />
      )}

      {modalEntry && (
        <ExerciseDetailModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}

      {showPlateCalc && <PlateCalculator weightUnit={weightUnit} onClose={() => setShowPlateCalc(false)} />}

      {showSettings && (
        <SettingsModal
          strengthRestDuration={strengthRestDuration}
          setStrengthRestDuration={setStrengthRestDuration}
          hypertrophyRestDuration={hypertrophyRestDuration}
          setHypertrophyRestDuration={setHypertrophyRestDuration}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          sessionCount={sessions.length}
          workoutDayCount={safeWorkoutTemplate.length}
          onExport={handleExport}
          onImport={handleImport}
          onOpenWorkoutEditor={() => {
            setShowSettings(false);
            setShowWorkoutEditor(true);
          }}
          onApplyFreeWeightWorkout={handleApplyFreeWeightWorkout}
          onResetWorkoutTemplate={handleResetWorkoutTemplate}
          onClearData={handleClearData}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showWorkoutEditor && (
        <WorkoutEditorModal
          workoutTemplate={safeWorkoutTemplate}
          onSave={handleSaveWorkoutTemplate}
          onClose={() => setShowWorkoutEditor(false)}
        />
      )}
    </div>
  );
}
