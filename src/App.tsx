import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import { WorkoutTemplate } from "./data";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useToast } from "./hooks/useToast";
import { useRestTimer } from "./hooks/useRestTimer";
import { useWorkoutTimer } from "./hooks/useWorkoutTimer";
import type { WorkoutProgress, SessionHistory, WorkoutSession, BodyWeightEntry } from "./types";
import { cn, formatTime, getClosestBodyWeight, resolveWeight } from "./utils";
import { findWikiEntry } from "./wikiData";
import type { ExerciseWiki } from "./wikiData";
import { Dumbbell, BookOpen, BarChart3, Settings, Calculator, Clock, Play, RotateCcw } from "lucide-react";

import ErrorBoundary from "./components/ErrorBoundary";
import ExerciseDetailModal from "./components/ExerciseDetailModal";
import PlateCalculator from "./components/PlateCalculator";
import WorkoutTab from "./components/WorkoutTab";
import RestTimerToast from "./components/RestTimerToast";
import DayCompleteOverlay from "./components/DayCompleteOverlay";
import FinishConfirmModal from "./components/FinishConfirmModal";
import SettingsModal from "./components/SettingsModal";
import ToastContainer from "./components/ui/ToastContainer";

const WikiView = lazy(() => import("./components/WikiView"));
const ChartsView = lazy(() => import("./components/ChartsView"));

type TabId = "workout" | "wiki" | "charts";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("workout");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const activeDay = WorkoutTemplate[activeDayIndex];

  // ─── Persisted state ─────────────────────────────────────────────────────
  const [progress, setProgress] = useLocalStorage<WorkoutProgress>("recomp88-progress", {});
  const [sessions, setSessions] = useLocalStorage<SessionHistory>("recomp88-sessions", []);
  const [strengthRestDuration, setStrengthRestDuration] = useLocalStorage<number>("recomp88-strength-rest", 120);
  const [hypertrophyRestDuration, setHypertrophyRestDuration] = useLocalStorage<number>("recomp88-hypertrophy-rest", 90);
  const [exerciseNotes, setExerciseNotes] = useLocalStorage<Record<string, string>>("recomp88-notes", {});
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("recomp88-sound", true);
  const [bodyWeightEntries, setBodyWeightEntries] = useLocalStorage<BodyWeightEntry[]>("recomp88-bodyweight", []);
  const [weightUnit, setWeightUnit] = useLocalStorage<"kg" | "lbs">("recomp88-weight-unit", "kg");

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
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // For undo support - stores refs for the undo callback in toast
  const prevProgressPercent = useRef<number>(0);

  // ─── PR computation ───────────────────────────────────────────────────────
  const allTimePRs = useMemo(() => {
    const prs: Record<string, number> = {};
    const defaultBw = weightUnit === "lbs" ? 175 : 80;
    sessions.forEach((session) => {
      const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
      session.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          const w = resolveWeight(set.loggedWeight, bw);
          if (w > (prs[ex.exerciseId] ?? 0)) prs[ex.exerciseId] = w;
        });
      });
    });
    return prs;
  }, [sessions, bodyWeightEntries, weightUnit]);

  // ─── Last session values per day/exercise/set ─────────────────────────────
  const lastSessionValues = useMemo(() => {
    const latest: Record<string, WorkoutSession> = {};
    sessions.forEach((s) => {
      if (!latest[s.dayId] || new Date(s.date) > new Date(latest[s.dayId].date)) {
        latest[s.dayId] = s;
      }
    });
    const values: Record<string, Record<string, Record<string, { weight: string; reps: string }>>> = {};
    Object.values(latest).forEach((session) => {
      values[session.dayId] = {};
      session.exercises.forEach((ex) => {
        values[session.dayId][ex.exerciseId] = {};
        ex.sets.forEach((set) => {
          values[session.dayId][ex.exerciseId][set.setId] = {
            weight: set.loggedWeight,
            reps: set.loggedReps,
          };
        });
      });
    });
    return values;
  }, [sessions]);

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

  // ─── Export / Import (now includes notes and settings) ─────────────────────
  const handleExport = useCallback(() => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
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
          },
          null,
          2
        ),
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
  }, [progress, sessions, bodyWeightEntries, exerciseNotes, strengthRestDuration, hypertrophyRestDuration, soundEnabled, weightUnit, showToast]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (typeof data !== "object" || data === null) throw new Error("Invalid format");
          if (data.progress && typeof data.progress === "object") setProgress(data.progress);
          if (data.sessions && Array.isArray(data.sessions)) setSessions(data.sessions);
          if (data.bodyWeightEntries && Array.isArray(data.bodyWeightEntries))
            setBodyWeightEntries(data.bodyWeightEntries);
          if (data.exerciseNotes && typeof data.exerciseNotes === "object")
            setExerciseNotes(data.exerciseNotes);
          if (data.settings && typeof data.settings === "object") {
            if (typeof data.settings.strengthRestDuration === "number")
              setStrengthRestDuration(() => data.settings.strengthRestDuration);
            if (typeof data.settings.hypertrophyRestDuration === "number")
              setHypertrophyRestDuration(() => data.settings.hypertrophyRestDuration);
            if (typeof data.settings.soundEnabled === "boolean")
              setSoundEnabled(() => data.settings.soundEnabled);
            if (data.settings.weightUnit === "kg" || data.settings.weightUnit === "lbs")
              setWeightUnit(() => data.settings.weightUnit);
          }
          setShowSettings(false);
          showToast("Data imported successfully");
        } catch {
          showToast("Failed to parse backup file", "error");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setProgress, setSessions, setBodyWeightEntries, setExerciseNotes, setStrengthRestDuration, setHypertrophyRestDuration, setSoundEnabled, setWeightUnit, showToast]
  );

  const handleClearData = useCallback(() => {
    localStorage.clear();
    location.reload();
  }, []);

  const openExerciseInfo = useCallback((exerciseName: string) => {
    const entry = findWikiEntry(exerciseName);
    if (entry) setModalEntry(entry);
  }, []);

  const tabs = [
    { id: "workout" as TabId, label: "Tracker", icon: Dumbbell },
    { id: "wiki" as TabId, label: "Wiki", icon: BookOpen },
    { id: "charts" as TabId, label: "Progress", icon: BarChart3 },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200 font-sans selection:bg-lime-400/30 overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(163,230,53,0.04),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(163,230,53,0.03),transparent_60%)] pointer-events-none" />

      {/* ═══ Toast Notifications ═══ */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-md mx-auto min-h-dvh bg-neutral-950/50 relative shadow-2xl flex flex-col pb-24 border-x border-white/4">
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
                {WorkoutTemplate.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayIndex(idx)}
                    role="tab"
                    aria-selected={activeDayIndex === idx}
                    className={cn(
                      "snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 border",
                      activeDayIndex === idx
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
                activeDayIndex={activeDayIndex}
                totalDays={WorkoutTemplate.length}
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

        {/* ═══ Bottom Navigation ═══ */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-40">
          <div className="pointer-events-auto bg-[#080808]/90 backdrop-blur-2xl border-t border-white/6 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 px-4">
            <nav className="flex items-center justify-around" aria-label="Main navigation">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 transition-all duration-200 px-5 py-1",
                      isActive ? "text-lime-400" : "text-neutral-600 hover:text-neutral-400"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div
                      className={cn(
                        "w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-lime-400/12 border border-lime-400/20"
                          : "border border-transparent"
                      )}
                    >
                      <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      className={cn(
                        "text-[9px] uppercase font-bold tracking-widest leading-none transition-all",
                        isActive ? "text-lime-400" : "text-neutral-600"
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>
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
          onExport={handleExport}
          onImport={handleImport}
          onClearData={handleClearData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
