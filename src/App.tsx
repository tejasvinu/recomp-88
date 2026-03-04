import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { WorkoutTemplate } from "./data";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { WorkoutProgress, SessionHistory, WorkoutSession, BodyWeightEntry } from "./types";
import { cn } from "./utils";
import {
  Check, Timer, RotateCcw, X, Dumbbell, BookOpen, BarChart3,
  Info, Settings, Download, Upload, CheckCircle2, FileText, Calculator,
  Minus, Plus, Clock, Volume2, VolumeX, History,
} from "lucide-react";
import { findWikiEntry } from "./wikiData";
import type { ExerciseWiki } from "./wikiData";
import ExerciseDetailModal from "./components/ExerciseDetailModal";
import WikiView from "./components/WikiView";
import ChartsView from "./components/ChartsView";
import PlateCalculator from "./components/PlateCalculator";

type TabId = "workout" | "wiki" | "charts";

const REST_STEP = 15;
const REST_MIN = 30;
const REST_MAX = 300;

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

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

  // ─── Ephemeral state ──────────────────────────────────────────────────────
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimerDuration, setRestTimerDuration] = useState<number>(90);
  const [modalEntry, setModalEntry] = useState<ExerciseWiki | null>(null);
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Workout session timer
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const importRef = useRef<HTMLInputElement>(null);
  const prevProgressPercent = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // ─── Workout timer tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (workoutStartTime === null) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // ─── Rest timer countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) {
      setRestTimer(null);
      if (soundEnabled) playTimerEndSound();
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 150]);
      return;
    }
    const interval = setInterval(() => {
      setRestTimer((t) => (t !== null && t > 0 ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer, soundEnabled]);

  // ─── Audio alert ─────────────────────────────────────────────────────────
  const playTimerEndSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const beepAt = (delay: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.28, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.28);
      };
      beepAt(0, 880);
      beepAt(0.18, 880);
      beepAt(0.36, 1047);
    } catch {
      // AudioContext not available — silent fail
    }
  };

  // ─── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // ─── PR computation — max weight ever logged per exercise ─────────────────
  const allTimePRs = useMemo(() => {
    const prs: Record<string, number> = {};
    sessions.forEach((session) => {
      session.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          const w = parseFloat(set.loggedWeight) || 0;
          if (w > (prs[ex.exerciseId] ?? 0)) prs[ex.exerciseId] = w;
        });
      });
    });
    return prs;
  }, [sessions]);

  // ─── Last session values per day/exercise/set ─────────────────────────────
  const lastSessionValues = useMemo(() => {
    // Find most recent session per day
    const latest: Record<string, WorkoutSession> = {};
    sessions.forEach((s) => {
      if (!latest[s.dayId] || new Date(s.date) > new Date(latest[s.dayId].date)) {
        latest[s.dayId] = s;
      }
    });
    // Build lookup: dayId → exerciseId → setId → { weight, reps }
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

  // ─── Day progress % ──────────────────────────────────────────────────────
  const calculateProgress = () => {
    let totalSets = 0, completedSets = 0;
    activeDay.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      ex.sets.forEach((set) => {
        if (progress[activeDay.id]?.[ex.id]?.[set.id]?.completed) completedSets++;
      });
    });
    return totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  };

  const progressPercent = calculateProgress();

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

  // ─── Swipe gesture (workout tab only) ────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTab !== "workout") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0 && activeDayIndex < WorkoutTemplate.length - 1) {
        setActiveDayIndex((i) => i + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (dx > 0 && activeDayIndex > 0) {
        setActiveDayIndex((i) => i - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // ─── Set actions ─────────────────────────────────────────────────────────
  const toggleSet = (
    dayId: string,
    exerciseId: string,
    setId: string,
    restType: "strength" | "hypertrophy" | "other"
  ) => {
    const isCompleted = progress[dayId]?.[exerciseId]?.[setId]?.completed || false;
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[dayId]) s[dayId] = {};
      if (!s[dayId][exerciseId]) s[dayId][exerciseId] = {};
      if (!s[dayId][exerciseId][setId])
        s[dayId][exerciseId][setId] = { completed: false, loggedWeight: "", loggedReps: "" };
      s[dayId][exerciseId][setId].completed = !isCompleted;
      return s;
    });
    if (!isCompleted) {
      if ("vibrate" in navigator) navigator.vibrate(50);
      // Start workout timer on first completed set
      if (workoutStartTime === null) setWorkoutStartTime(Date.now());
      if (restType !== "other") {
        const duration = restType === "strength" ? strengthRestDuration : hypertrophyRestDuration;
        setRestTimerDuration(duration);
        setRestTimer(duration);
      }
    }
  };

  const updateSetData = (
    dayId: string,
    exerciseId: string,
    setId: string,
    field: "loggedWeight" | "loggedReps",
    value: string
  ) => {
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[dayId]) s[dayId] = {};
      if (!s[dayId][exerciseId]) s[dayId][exerciseId] = {};
      if (!s[dayId][exerciseId][setId])
        s[dayId][exerciseId][setId] = { completed: false, loggedWeight: "", loggedReps: "" };
      s[dayId][exerciseId][setId][field] = value;
      return s;
    });
  };

  // ─── Weight increment/decrement ──────────────────────────────────────────
  const adjustWeight = (exerciseId: string, setId: string, delta: number) => {
    const currentVal = progress[activeDay.id]?.[exerciseId]?.[setId]?.loggedWeight || "";
    const currentNum = parseFloat(currentVal);
    const base = isNaN(currentNum) ? 0 : currentNum;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    updateSetData(activeDay.id, exerciseId, setId, "loggedWeight", next > 0 ? String(next) : "");
  };

  // ─── BW quick-fill ────────────────────────────────────────────────────────
  const handleBwFill = (exerciseId: string) => {
    const exercise = activeDay.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const allBw = exercise.sets.every(
      (set) => (progress[activeDay.id]?.[exercise.id]?.[set.id]?.loggedWeight ?? "") === "BW"
    );
    const newValue = allBw ? "" : "BW";
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[activeDay.id]) s[activeDay.id] = {};
      if (!s[activeDay.id][exerciseId]) s[activeDay.id][exerciseId] = {};
      exercise.sets.forEach((set) => {
        if (!s[activeDay.id][exerciseId][set.id])
          s[activeDay.id][exerciseId][set.id] = { completed: false, loggedWeight: "", loggedReps: "" };
        s[activeDay.id][exerciseId][set.id].loggedWeight = newValue;
      });
      return s;
    });
  };

  // ─── Load last session values for an exercise ─────────────────────────────
  const loadLastSession = (exerciseId: string) => {
    const lastVals = lastSessionValues[activeDay.id]?.[exerciseId];
    if (!lastVals) return;
    const exercise = activeDay.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[activeDay.id]) s[activeDay.id] = {};
      if (!s[activeDay.id][exerciseId]) s[activeDay.id][exerciseId] = {};
      exercise.sets.forEach((set) => {
        if (!s[activeDay.id][exerciseId][set.id])
          s[activeDay.id][exerciseId][set.id] = { completed: false, loggedWeight: "", loggedReps: "" };
        const vals = lastVals[set.id];
        if (vals) {
          s[activeDay.id][exerciseId][set.id].loggedWeight = vals.weight;
          s[activeDay.id][exerciseId][set.id].loggedReps = vals.reps;
        }
      });
      return s;
    });
    showToast("Loaded last session");
  };

  // ─── Finish workout ───────────────────────────────────────────────────────
  const finishWorkout = () => {
    const dayProgress = progress[activeDay.id];
    if (dayProgress) {
      const hasData = activeDay.exercises.some((ex) =>
        ex.sets.some((set) => {
          const s = dayProgress[ex.id]?.[set.id];
          return s && (s.loggedWeight || s.loggedReps);
        })
      );
      if (hasData) {
        const duration = workoutStartTime
          ? Math.floor((Date.now() - workoutStartTime) / 1000)
          : undefined;
        const session: WorkoutSession = {
          id: `${activeDay.id}-${Date.now()}`,
          date: new Date().toISOString(),
          dayId: activeDay.id,
          dayName: activeDay.name,
          duration,
          exercises: activeDay.exercises
            .filter((ex) => ex.type !== "other")
            .map((ex) => ({
              exerciseId: ex.id,
              name: ex.name,
              type: ex.type,
              sets: ex.sets
                .map((set) => ({
                  setId: set.id,
                  loggedWeight: dayProgress[ex.id]?.[set.id]?.loggedWeight || "",
                  loggedReps: dayProgress[ex.id]?.[set.id]?.loggedReps || "",
                }))
                .filter((s) => s.loggedWeight || s.loggedReps),
            }))
            .filter((ex) => ex.sets.length > 0),
        };
        setSessions((prev) => [...prev, session]);
      }
    }
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (s[activeDay.id]) {
        Object.keys(s[activeDay.id]).forEach((exId) => {
          Object.keys(s[activeDay.id][exId]).forEach((setId) => {
            s[activeDay.id][exId][setId].completed = false;
          });
        });
      }
      return s;
    });
    setRestTimer(null);
    setWorkoutStartTime(null);
    setElapsedSeconds(0);
    setShowFinishConfirm(false);
    showToast(`${activeDay.name} saved!`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Delete session ───────────────────────────────────────────────────────
  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast("Session deleted");
  };

  // ─── Body weight ──────────────────────────────────────────────────────────
  const logBodyWeight = (weight: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setBodyWeightEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [...filtered, { date: today, weight }].sort((a, b) => a.date.localeCompare(b.date));
    });
    showToast("Body weight logged");
  };

  // ─── Export / Import ──────────────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ progress, sessions, bodyWeightEntries, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recomp88-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setShowSettings(false);
        showToast("Data imported successfully");
      } catch {
        showToast("Failed to parse backup file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openExerciseInfo = (exerciseName: string) => {
    const entry = findWikiEntry(exerciseName);
    if (entry) setModalEntry(entry);
  };

  const timerPercent =
    restTimerDuration > 0 && restTimer !== null ? (restTimer / restTimerDuration) * 100 : 0;

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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-down",
              toast.type === "success"
                ? "bg-neutral-900/95 border-lime-400/25 text-white"
                : "bg-neutral-900/95 border-red-400/30 text-white"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                toast.type === "success" ? "bg-lime-400" : "bg-red-400"
              )}
            />
            <span className="text-[13px] font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-md mx-auto min-h-dvh bg-neutral-950/50 relative shadow-2xl flex flex-col pb-24 border-x border-white/4">

        {/* ═══ Sticky Header ═══ */}
        <header className="sticky top-0 z-40 bg-[#080808]/80 backdrop-blur-2xl border-b border-white/6 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-lime-400">Recomp</h1>
              <span className="text-2xl font-black uppercase tracking-[0.12em] text-white/90">88</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Workout elapsed timer */}
              {activeTab === "workout" && workoutStartTime !== null && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/8">
                  <Clock size={12} className="text-lime-400" />
                  <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}
              {activeTab === "workout" && (
                <button
                  onClick={() => setShowPlateCalc(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-lime-400 hover:bg-lime-400/10 hover:border-lime-400/20 transition-all"
                  title="Plate Calculator"
                >
                  <Calculator size={15} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-neutral-300 hover:bg-white/8 transition-all"
                title="Settings"
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          {activeTab === "workout" && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-white/6 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)] transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums shrink-0">
                  {progressPercent}%
                </span>
              </div>

              <div className="flex overflow-x-auto gap-1.5 scrollbar-none snap-x -mx-0.5 px-0.5">
                {WorkoutTemplate.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayIndex(idx)}
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
        <main
          className="flex-1 p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* ─── WORKOUT TAB ─── */}
          {activeTab === "workout" && (
            <div className="flex flex-col gap-4">
              {activeDay.exercises.map((exercise, exIdx) => {
                const isBwActive =
                  exercise.sets.every(
                    (set) =>
                      (progress[activeDay.id]?.[exercise.id]?.[set.id]?.loggedWeight ?? "") === "BW"
                  ) && exercise.sets.length > 0;
                const hasNote = !!exerciseNotes[exercise.id]?.trim();
                const isNoteOpen = expandedNoteId === exercise.id;
                const hasLastSession = !!lastSessionValues[activeDay.id]?.[exercise.id];

                return (
                  <div
                    key={exercise.id}
                    className="bg-neutral-900/50 border border-white/6 p-4 rounded-2xl flex flex-col gap-3 shadow-lg"
                  >
                    {/* Exercise Header */}
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-[10px] font-mono font-bold text-neutral-500 mt-0.5">
                        {exIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-[15px] font-bold text-white tracking-wide truncate leading-snug">
                            {exercise.name}
                          </h2>
                          {/* Wiki info */}
                          {findWikiEntry(exercise.name) && (
                            <button
                              onClick={() => openExerciseInfo(exercise.name)}
                              className="shrink-0 w-6 h-6 bg-white/5 hover:bg-lime-400/15 rounded-full flex items-center justify-center transition-colors group border border-white/6 hover:border-lime-400/30"
                              title="View exercise info"
                            >
                              <Info size={12} className="text-neutral-500 group-hover:text-lime-400 transition-colors" />
                            </button>
                          )}
                          {/* Notes */}
                          {exercise.type !== "other" && (
                            <button
                              onClick={() => setExpandedNoteId(isNoteOpen ? null : exercise.id)}
                              className={cn(
                                "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors border relative",
                                isNoteOpen || hasNote
                                  ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                                  : "bg-white/5 border-white/6 text-neutral-500 hover:bg-lime-400/10 hover:text-lime-400/80 hover:border-lime-400/20"
                              )}
                              title="Notes"
                            >
                              <FileText size={11} />
                              {hasNote && !isNoteOpen && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-lime-400 rounded-full" />
                              )}
                            </button>
                          )}
                          {/* Load last session */}
                          {exercise.type !== "other" && hasLastSession && (
                            <button
                              onClick={() => loadLastSession(exercise.id)}
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors border bg-white/5 border-white/6 text-neutral-500 hover:bg-sky-400/10 hover:text-sky-400 hover:border-sky-400/20"
                              title="Load last session values"
                            >
                              <History size={11} />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                          {exercise.type !== "other" && (
                            <span
                              className={cn(
                                "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border",
                                exercise.type === "strength"
                                  ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                  : "text-sky-400 bg-sky-500/10 border-sky-500/20"
                              )}
                            >
                              {exercise.type === "strength" ? "Strength" : "Hypertrophy"}
                            </span>
                          )}
                          {exercise.details && (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/8">
                              {exercise.details}
                            </span>
                          )}
                          {exercise.type !== "other" && (
                            <button
                              onClick={() => handleBwFill(exercise.id)}
                              className={cn(
                                "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border transition-all",
                                isBwActive
                                  ? "text-lime-400 bg-lime-400/10 border-lime-400/25"
                                  : "text-neutral-600 bg-white/3 border-white/6 hover:text-neutral-400 hover:bg-white/6"
                              )}
                              title="Toggle bodyweight for all sets"
                            >
                              BW
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column Headers */}
                    {exercise.type !== "other" && (
                      <div className="grid grid-cols-[20px_1fr_1fr_44px] gap-2 px-1 text-[9px] font-bold text-neutral-600 uppercase tracking-[0.15em] text-center">
                        <div className="text-left">#</div>
                        <div>{isBwActive ? "load" : "kg"}</div>
                        <div>reps</div>
                        <div />
                      </div>
                    )}

                    {/* Set Rows */}
                    {exercise.sets.map((set, setIdx) => {
                      const setProgress = progress[activeDay.id]?.[exercise.id]?.[set.id];
                      const isCompleted = setProgress?.completed || false;
                      const weightVal = setProgress?.loggedWeight || "";
                      const isBwSet = weightVal === "BW";

                      // Last session ghost placeholders
                      const lastVals = lastSessionValues[activeDay.id]?.[exercise.id]?.[set.id];
                      const weightPlaceholder = lastVals?.weight || "—";
                      const repsPlaceholder = lastVals?.reps || set.targetReps;

                      // PR detection: current weight beats all-time best
                      const currentWeight = parseFloat(weightVal);
                      const prBest = allTimePRs[exercise.id] ?? 0;
                      const isPR =
                        !isBwSet &&
                        !isNaN(currentWeight) &&
                        currentWeight > 0 &&
                        currentWeight > prBest;

                      return (
                        <div
                          key={set.id}
                          className={cn(
                            "grid gap-2 items-center px-2 py-2 rounded-xl border transition-all duration-300",
                            exercise.type !== "other"
                              ? "grid-cols-[20px_1fr_1fr_44px]"
                              : "grid-cols-[1fr_44px]",
                            isCompleted
                              ? "bg-lime-400/7 border-lime-400/25"
                              : "bg-white/3 border-white/5"
                          )}
                        >
                          {exercise.type !== "other" && (
                            <div
                              className={cn(
                                "text-[11px] font-mono font-bold text-center tabular-nums",
                                isCompleted ? "text-lime-400" : "text-neutral-600"
                              )}
                            >
                              {setIdx + 1}
                            </div>
                          )}

                          {exercise.type !== "other" && (
                            isBwSet ? (
                              <div
                                className={cn(
                                  "w-full flex items-center justify-center rounded-lg py-2 px-2 border font-mono font-bold text-[11px] uppercase tracking-widest",
                                  isCompleted
                                    ? "bg-lime-400/10 border-lime-400/20 text-lime-400"
                                    : "bg-white/5 border-white/8 text-neutral-400"
                                )}
                              >
                                BW
                              </div>
                            ) : (
                              /* Weight input with ± steppers */
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => adjustWeight(exercise.id, set.id, -2.5)}
                                  className="shrink-0 w-5 h-8 flex items-center justify-center rounded-md bg-white/4 border border-white/7 text-neutral-500 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                                  title="–2.5 kg"
                                >
                                  <Minus size={9} />
                                </button>
                                <div className="relative flex-1 min-w-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*"
                                    placeholder={weightPlaceholder}
                                    value={weightVal}
                                    onChange={(e) =>
                                      updateSetData(activeDay.id, exercise.id, set.id, "loggedWeight", e.target.value)
                                    }
                                    onFocus={(e) => e.target.select()}
                                    className={cn(
                                      "w-full bg-white/6 border text-center font-mono font-medium outline-none rounded-lg py-2 px-1 text-sm transition-all text-white placeholder-neutral-600 focus:ring-1 focus:ring-lime-400/40 focus:bg-white/9",
                                      isPR
                                        ? "border-yellow-400/50 bg-yellow-400/5 focus:border-yellow-400/60"
                                        : "border-white/8 focus:border-lime-400/30",
                                      isCompleted && "text-lime-100/90"
                                    )}
                                  />
                                  {isPR && (
                                    <span className="absolute -top-2 right-0 text-[8px] font-black bg-yellow-400 text-neutral-900 px-1 py-px rounded-sm leading-tight tracking-wide pointer-events-none">
                                      PR
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => adjustWeight(exercise.id, set.id, +2.5)}
                                  className="shrink-0 w-5 h-8 flex items-center justify-center rounded-md bg-white/4 border border-white/7 text-neutral-500 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                                  title="+2.5 kg"
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                            )
                          )}

                          {exercise.type !== "other" && (
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder={repsPlaceholder}
                              value={setProgress?.loggedReps || ""}
                              onChange={(e) =>
                                updateSetData(activeDay.id, exercise.id, set.id, "loggedReps", e.target.value)
                              }
                              onFocus={(e) => e.target.select()}
                              className={cn(
                                "w-full bg-white/6 border border-white/8 text-center font-mono font-medium outline-none rounded-lg py-2 px-2 text-sm transition-all placeholder-neutral-600 focus:ring-1 focus:ring-lime-400/40 focus:bg-white/9 focus:border-lime-400/30",
                                isCompleted ? "text-lime-400" : "text-white"
                              )}
                            />
                          )}

                          {exercise.type === "other" && (
                            <div className="text-[11px] font-semibold text-neutral-400 px-1 uppercase tracking-wider">
                              Mark complete
                            </div>
                          )}

                          <button
                            onClick={() => toggleSet(activeDay.id, exercise.id, set.id, exercise.type)}
                            className={cn(
                              "w-11 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 border",
                              isCompleted
                                ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_2px_12px_rgba(163,230,53,0.35)]"
                                : "bg-white/4 text-neutral-600 border-white/7 hover:bg-white/8 hover:text-white"
                            )}
                          >
                            <Check strokeWidth={isCompleted ? 3.5 : 2} size={17} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Notes section */}
                    {isNoteOpen && (
                      <div className="border-t border-white/5 pt-3 mt-1">
                        <textarea
                          value={exerciseNotes[exercise.id] || ""}
                          onChange={(e) =>
                            setExerciseNotes((prev) => ({ ...prev, [exercise.id]: e.target.value }))
                          }
                          placeholder="Add notes for this exercise… (cues, feel, adjustments)"
                          rows={3}
                          className="w-full bg-white/4 border border-white/7 rounded-xl p-3 text-[12px] text-neutral-200 placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 resize-none font-medium leading-relaxed transition-all"
                        />
                        <p className="text-[9px] text-neutral-700 font-medium mt-1.5 px-1 uppercase tracking-wider">
                          Saved automatically
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Finish Workout */}
              <div className="mt-6 mb-4">
                <button
                  onClick={() => setShowFinishConfirm(true)}
                  className={cn(
                    "w-full active:scale-[0.98] flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[12px] tracking-[0.18em] uppercase transition-all border",
                    progressPercent === 100
                      ? "bg-lime-400/15 hover:bg-lime-400/22 border-lime-400/40 text-lime-400"
                      : "bg-white/4 hover:bg-white/7 border-white/9 text-white"
                  )}
                >
                  <RotateCcw size={15} className="text-lime-400" />
                  Finish &amp; Reset Workout
                </button>
                <p className="text-center text-[10px] text-neutral-600 mt-2.5 px-6 font-medium leading-relaxed">
                  Saves session to history · clears checkmarks · keeps logged weights &amp; reps
                </p>
              </div>
            </div>
          )}

          {activeTab === "wiki" && <WikiView />}
          {activeTab === "charts" && (
            <ChartsView
              progress={progress}
              sessions={sessions}
              onOpenExercise={openExerciseInfo}
              onDeleteSession={deleteSession}
              bodyWeightEntries={bodyWeightEntries}
              onLogBodyWeight={logBodyWeight}
            />
          )}
        </main>

        {/* ═══ Day Complete Overlay ═══ */}
        <div
          className={cn(
            "fixed inset-0 z-60 flex items-center justify-center transition-all duration-500 pointer-events-none",
            showDayComplete ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={cn(
              "relative z-10 flex flex-col items-center gap-4 transition-all duration-500",
              showDayComplete ? "scale-100 translate-y-0" : "scale-90 translate-y-4"
            )}
          >
            <div className="w-20 h-20 bg-lime-400 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(163,230,53,0.5)]">
              <CheckCircle2 size={44} className="text-neutral-950" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white uppercase tracking-widest">Day Done</p>
              <p className="text-[13px] text-lime-400 font-bold uppercase tracking-widest mt-1">
                {activeDay.name}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Rest Timer Toast ═══ */}
        <div
          className={cn(
            "fixed bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[380px] bg-neutral-900/95 backdrop-blur-2xl border border-white/8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500 z-50",
            restTimer !== null
              ? "translate-y-0 opacity-100"
              : "translate-y-[200%] opacity-0 pointer-events-none"
          )}
        >
          <div className="h-[2px] bg-white/6 w-full">
            <div
              className="h-full bg-lime-400 transition-all duration-1000 ease-linear"
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
                <Timer size={18} strokeWidth={2} className="text-lime-400" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-neutral-500 tracking-widest uppercase block leading-none mb-1">
                  {restTimerDuration === strengthRestDuration ? "Strength Rest" : "Rest Period"}
                </span>
                <span className="text-2xl font-mono font-bold text-white tabular-nums leading-none">
                  {restTimer !== null ? formatTime(restTimer) : "0:00"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setRestTimer(null)}
              className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors border border-white/7"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ═══ Bottom Navigation ═══ */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-40">
          <div className="pointer-events-auto bg-[#080808]/90 backdrop-blur-2xl border-t border-white/6 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 px-4">
            <nav className="flex items-center justify-around">
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

      {/* ═══ Finish Confirm Modal ═══ */}
      {showFinishConfirm && (
        <div
          className="fixed inset-0 z-70 flex items-end sm:items-center justify-center"
          onClick={() => setShowFinishConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up p-5"
          >
            <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center">
                <RotateCcw size={24} className="text-lime-400" />
              </div>
              <div>
                <h3 className="text-[17px] font-black text-white tracking-wide">
                  {activeDay.name}
                </h3>
                <p className="text-[13px] text-neutral-400 font-medium mt-1">
                  Save this session and reset checkmarks?
                </p>
                {workoutStartTime !== null && (
                  <p className="text-[11px] text-neutral-600 font-medium mt-2">
                    Duration:{" "}
                    <span className="text-lime-400 font-mono">{formatTime(elapsedSeconds)}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/8 bg-white/4 text-neutral-400 font-bold text-[13px] hover:bg-white/8 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={finishWorkout}
                  className="flex-1 py-3 rounded-xl border border-lime-400/30 bg-lime-400/15 text-lime-400 font-black text-[13px] hover:bg-lime-400/25 transition-all"
                >
                  Save &amp; Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Exercise Info Modal ═══ */}
      {modalEntry && (
        <ExerciseDetailModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}

      {/* ═══ Plate Calculator ═══ */}
      {showPlateCalc && (
        <PlateCalculator onClose={() => setShowPlateCalc(false)} />
      )}

      {/* ═══ Settings Modal ═══ */}
      {showSettings && (
        <div
          className="fixed inset-0 z-70 flex items-end sm:items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up"
          >
            <div className="border-b border-white/6 px-5 pt-5 pb-4">
              <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-black text-white tracking-wide">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/7"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh] overscroll-contain">

              {/* Rest Timer Customization */}
              <div>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Timer size={12} className="text-lime-400" />
                  Rest Timers
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "Strength",
                      desc: "After strength sets",
                      value: strengthRestDuration,
                      set: setStrengthRestDuration,
                    },
                    {
                      label: "Hypertrophy",
                      desc: "After hypertrophy sets",
                      value: hypertrophyRestDuration,
                      set: setHypertrophyRestDuration,
                    },
                  ].map(({ label, desc, value, set }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between bg-white/4 border border-white/7 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-[13px] font-bold text-white">{label}</p>
                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => set((v) => Math.max(REST_MIN, v - REST_STEP))}
                          className="w-7 h-7 bg-white/6 hover:bg-white/12 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white border border-white/8 transition-all active:scale-90"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-[14px] font-mono font-bold text-lime-400 tabular-nums w-12 text-center">
                          {value}s
                        </span>
                        <button
                          onClick={() => set((v) => Math.min(REST_MAX, v + REST_STEP))}
                          className="w-7 h-7 bg-white/6 hover:bg-white/12 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white border border-white/8 transition-all active:scale-90"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 size={12} className="text-lime-400" />
                  ) : (
                    <VolumeX size={12} className="text-neutral-500" />
                  )}
                  Audio
                </p>
                <button
                  onClick={() => setSoundEnabled((v) => !v)}
                  className="flex items-center justify-between w-full bg-white/4 border border-white/7 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-bold text-white text-left">Timer end beep</p>
                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5 text-left">
                      Play sound when rest timer finishes
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-11 h-6 rounded-full border transition-all relative shrink-0",
                      soundEnabled
                        ? "bg-lime-400/20 border-lime-400/40"
                        : "bg-white/6 border-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200",
                        soundEnabled
                          ? "left-5 bg-lime-400"
                          : "left-0.5 bg-neutral-500"
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Data / Backup */}
              <div>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Download size={12} className="text-lime-400" />
                  Data Backup
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                  >
                    <div className="w-9 h-9 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
                      <Download size={16} className="text-lime-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-white group-hover:text-lime-400 transition-colors">
                        Export JSON
                      </p>
                      <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                        Download all progress &amp; session history
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => importRef.current?.click()}
                    className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                  >
                    <div className="w-9 h-9 bg-white/6 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <Upload size={16} className="text-neutral-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-white">Import JSON</p>
                      <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                        Restore from a previous export
                      </p>
                    </div>
                  </button>

                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                  <span className="text-neutral-400 font-bold">Sessions saved:</span>{" "}
                  {sessions.length} workout{sessions.length !== 1 ? "s" : ""} logged
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
