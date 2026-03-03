import { useState, useEffect } from "react";
import { WorkoutTemplate } from "./data";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { WorkoutProgress } from "./types";
import { cn } from "./utils";
import { Check, Timer, RotateCcw, X, Dumbbell, BookOpen, BarChart3, Info } from "lucide-react";
import { findWikiEntry } from "./wikiData";
import type { ExerciseWiki } from "./wikiData";
import ExerciseDetailModal from "./components/ExerciseDetailModal";
import WikiView from "./components/WikiView";
import ChartsView from "./components/ChartsView";

type TabId = "workout" | "wiki" | "charts";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("workout");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const activeDay = WorkoutTemplate[activeDayIndex];

  const [progress, setProgress] = useLocalStorage<WorkoutProgress>("recomp88-progress", {});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [modalEntry, setModalEntry] = useState<ExerciseWiki | null>(null);

  // Timer logic
  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) {
      setRestTimer(null);
      return;
    }
    const interval = setInterval(() => {
      setRestTimer((t) => (t !== null && t > 0 ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  const toggleSet = (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => {
    const isCompleted = progress[dayId]?.[exerciseId]?.[setId]?.completed || false;
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[dayId]) s[dayId] = {};
      if (!s[dayId][exerciseId]) s[dayId][exerciseId] = {};
      if (!s[dayId][exerciseId][setId]) s[dayId][exerciseId][setId] = { completed: false, loggedWeight: "", loggedReps: "" };
      s[dayId][exerciseId][setId].completed = !isCompleted;
      return s;
    });
    if (!isCompleted && restType !== "other") {
      setRestTimer(restType === "strength" ? 120 : 90);
    }
  };

  const updateSetData = (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps", value: string) => {
    setProgress((prev) => {
      const s = JSON.parse(JSON.stringify(prev));
      if (!s[dayId]) s[dayId] = {};
      if (!s[dayId][exerciseId]) s[dayId][exerciseId] = {};
      if (!s[dayId][exerciseId][setId]) s[dayId][exerciseId][setId] = { completed: false, loggedWeight: "", loggedReps: "" };
      s[dayId][exerciseId][setId][field] = value;
      return s;
    });
  };

  const finishWorkout = () => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateProgress = () => {
    let totalSets = 0;
    let completedSets = 0;
    activeDay.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      ex.sets.forEach((set) => {
        if (progress[activeDay.id]?.[ex.id]?.[set.id]?.completed) completedSets++;
      });
    });
    return totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  };

  const progressPercent = calculateProgress();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openExerciseInfo = (exerciseName: string) => {
    const entry = findWikiEntry(exerciseName);
    if (entry) setModalEntry(entry);
  };

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <div className="max-w-md mx-auto min-h-screen bg-neutral-950 relative shadow-2xl flex flex-col pb-20">

        {/* ═══ Sticky Header ═══ */}
        <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 p-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-lime-400">
              Recomp<span className="text-white">-88</span>
            </h1>
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800 uppercase tracking-widest">
              v1.0
            </span>
          </div>

          {/* Tab-specific header content */}
          {activeTab === "workout" && (
            <>
              {/* Progress Bar */}
              <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-lime-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                <span>{activeDay.name}</span>
                <span className="text-lime-400">{progressPercent}%</span>
              </div>

              {/* Day Navigation */}
              <div className="flex overflow-x-auto gap-2 mt-4 pb-1 scrollbar-none snap-x">
                {WorkoutTemplate.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayIndex(idx)}
                    className={cn(
                      "snap-center shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-200 border tracking-wider",
                      activeDayIndex === idx
                        ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.25)]"
                        : "bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-300"
                    )}
                  >
                    D{day.dayNumber}
                  </button>
                ))}
              </div>
            </>
          )}
        </header>

        {/* ═══ Content ═══ */}
        <main className="flex-1 p-4">
          {/* ─── WORKOUT TAB ─── */}
          {activeTab === "workout" && (
            <div className="flex flex-col gap-5">
              {activeDay.exercises.map((exercise, exIdx) => (
                <div key={exercise.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col gap-3.5">
                  {/* Exercise Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-white tracking-wide truncate">
                          {exIdx + 1}. {exercise.name}
                        </h2>
                        {/* Info button to open wiki popup */}
                        {findWikiEntry(exercise.name) && (
                          <button
                            onClick={() => openExerciseInfo(exercise.name)}
                            className="shrink-0 w-6 h-6 bg-neutral-800 hover:bg-lime-400/20 rounded-md flex items-center justify-center transition-colors group"
                            title="View exercise info"
                          >
                            <Info size={12} className="text-neutral-500 group-hover:text-lime-400 transition-colors" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1.5">
                        {exercise.type !== "other" && (
                          <span className={cn(
                            "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded border",
                            exercise.type === "strength"
                              ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                              : "text-sky-400 bg-sky-400/10 border-sky-400/20"
                          )}>
                            {exercise.type === "strength" ? "STR" : "HYPER"}
                          </span>
                        )}
                        {exercise.details && (
                          <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                            {exercise.details}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column Headers */}
                  {exercise.type !== "other" && (
                    <div className="grid grid-cols-[28px_1fr_1fr_48px] gap-2.5 px-0.5 text-[9px] font-black text-neutral-600 uppercase tracking-[0.15em] text-center">
                      <div className="text-left">Set</div>
                      <div>KG</div>
                      <div>Reps</div>
                      <div></div>
                    </div>
                  )}

                  {/* Set Rows */}
                  {exercise.sets.map((set, setIdx) => {
                    const setProgress = progress[activeDay.id]?.[exercise.id]?.[set.id];
                    const isCompleted = setProgress?.completed || false;

                    return (
                      <div
                        key={set.id}
                        className={cn(
                          "grid gap-2.5 items-center p-2 rounded-xl border transition-all duration-200",
                          exercise.type !== "other" ? "grid-cols-[28px_1fr_1fr_48px]" : "grid-cols-[1fr_48px]",
                          isCompleted
                            ? "bg-lime-400/5 border-lime-400/25"
                            : "bg-neutral-950 border-neutral-800"
                        )}
                      >
                        {exercise.type !== "other" && (
                          <div className={cn("text-xs font-black text-center tabular-nums", isCompleted ? "text-lime-400" : "text-neutral-600")}>
                            {setIdx + 1}
                          </div>
                        )}

                        {exercise.type !== "other" && (
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            placeholder="—"
                            value={setProgress?.loggedWeight || ""}
                            onChange={(e) => updateSetData(activeDay.id, exercise.id, set.id, "loggedWeight", e.target.value)}
                            className={cn(
                              "w-full bg-neutral-900 border text-center font-bold outline-none rounded-lg py-2.5 px-2 text-sm transition-colors text-white placeholder-neutral-700 focus:ring-1 focus:ring-lime-400",
                              isCompleted ? "border-lime-400/25" : "border-neutral-800 focus:border-lime-400"
                            )}
                          />
                        )}

                        {exercise.type !== "other" && (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder={set.targetReps}
                            value={setProgress?.loggedReps || ""}
                            onChange={(e) => updateSetData(activeDay.id, exercise.id, set.id, "loggedReps", e.target.value)}
                            className={cn(
                              "w-full bg-neutral-900 border text-center font-bold outline-none rounded-lg py-2.5 px-2 text-sm transition-colors placeholder-neutral-600 focus:ring-1 focus:ring-lime-400",
                              isCompleted ? "border-lime-400/25 text-lime-400" : "border-neutral-800 text-white focus:border-lime-400"
                            )}
                          />
                        )}

                        {exercise.type === "other" && (
                          <div className="text-xs font-bold text-neutral-400 px-1 uppercase tracking-wider">
                            Mark complete
                          </div>
                        )}

                        <button
                          onClick={() => toggleSet(activeDay.id, exercise.id, set.id, exercise.type)}
                          className={cn(
                            "w-12 h-11 flex items-center justify-center rounded-xl transition-all duration-300 active:scale-90",
                            isCompleted
                              ? "bg-lime-400 text-neutral-950 shadow-[0_0_12px_rgba(163,230,53,0.35)]"
                              : "bg-neutral-800 text-neutral-600 hover:bg-neutral-700"
                          )}
                        >
                          <Check strokeWidth={isCompleted ? 4 : 2.5} size={20} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Finish Workout */}
              <div className="mt-6 mb-4">
                <button
                  onClick={finishWorkout}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 active:bg-neutral-800 flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-xs tracking-[0.15em] uppercase transition-colors"
                >
                  <RotateCcw size={16} className="text-lime-400" />
                  Finish Workout
                </button>
                <p className="text-center text-[10px] text-neutral-600 mt-2.5 px-6 font-medium leading-relaxed">
                  Clears checkmarks but keeps your logged weights & reps for progressive overload tracking.
                </p>
              </div>
            </div>
          )}

          {/* ─── WIKI TAB ─── */}
          {activeTab === "wiki" && <WikiView />}

          {/* ─── CHARTS TAB ─── */}
          {activeTab === "charts" && <ChartsView progress={progress} />}
        </main>

        {/* ═══ Rest Timer Toast ═══ */}
        <div
          className={cn(
            "fixed bottom-24 left-1/2 -translate-x-1/2 w-[88%] max-w-[360px] bg-neutral-900/95 backdrop-blur-xl border border-lime-400/30 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between transition-all duration-500 z-50",
            restTimer !== null ? "translate-y-0 opacity-100" : "translate-y-[200%] opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center text-neutral-950 animate-pulse">
              <Timer size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[9px] font-black text-neutral-500 tracking-widest uppercase block">Rest</span>
              <span className="text-xl font-black text-lime-400 tabular-nums">
                {restTimer !== null ? formatTime(restTimer) : "0:00"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setRestTimer(null)}
            className="w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ Bottom Navigation ═══ */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 z-40">
          <div className="flex items-center justify-around py-2 px-2">
            {([
              { id: "workout" as TabId, label: "Tracker", icon: Dumbbell },
              { id: "wiki" as TabId, label: "Wiki", icon: BookOpen },
              { id: "charts" as TabId, label: "Progress", icon: BarChart3 },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={cn(
                  "flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200",
                  activeTab === id
                    ? "text-lime-400"
                    : "text-neutral-600 hover:text-neutral-400"
                )}
              >
                <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.5} />
                <span className={cn("text-[9px] uppercase font-black tracking-widest", activeTab === id && "text-lime-400")}>{label}</span>
                {activeTab === id && <div className="w-1 h-1 bg-lime-400 rounded-full" />}
              </button>
            ))}
          </div>
        </nav>

      </div>

      {/* ═══ Exercise Info Modal (shared) ═══ */}
      {modalEntry && (
        <ExerciseDetailModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}
    </div>
  );
}
