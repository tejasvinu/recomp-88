'use client';

import { useState, useMemo, useEffect } from "react";
import { X, Calendar, Dumbbell, Code, Check, DatabaseBackup, Save, FileJson } from "lucide-react";
import { cn, resolveWeight, getClosestBodyWeight } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";
import type { WorkoutTemplate, WorkoutSession, BodyWeightEntry } from "../types";

interface AddPastSessionModalProps {
  workoutTemplate: WorkoutTemplate;
  bodyWeightEntries: BodyWeightEntry[];
  weightUnit: "kg" | "lbs";
  onAddSessions: (sessions: WorkoutSession[]) => void;
  onClose: () => void;
}

type EntryMode = "manual" | "day-json" | "json";

export default function AddPastSessionModal({
  workoutTemplate,
  bodyWeightEntries,
  weightUnit,
  onAddSessions,
  onClose,
}: AddPastSessionModalProps) {
  useModalEscape(onClose);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [mode, setMode] = useState<EntryMode>("manual");

  // Manual Mode State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedDayId, setSelectedDayId] = useState<string>(
    workoutTemplate[0]?.id || ""
  );
  const [durationMinutes, setDurationMinutes] = useState<string>("45");

  // exerciseId -> setId -> { loggedWeight, loggedReps }
  const [progress, setProgress] = useState<
    Record<string, Record<string, { loggedWeight: string; loggedReps: string }>>
  >({});

  // JSON Mode State
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");

  // Day JSON Mode State
  const [dayJsonInput, setDayJsonInput] = useState("");
  const [dayJsonError, setDayJsonError] = useState("");

  const activeDay = useMemo(
    () => workoutTemplate.find((d) => d.id === selectedDayId) || workoutTemplate[0],
    [selectedDayId, workoutTemplate]
  );

  const handleUpdateSet = (
    exerciseId: string,
    setId: string,
    field: "loggedWeight" | "loggedReps",
    value: string
  ) => {
    setProgress((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || {}),
        [setId]: {
          ...(prev[exerciseId]?.[setId] || { loggedWeight: "", loggedReps: "" }),
          [field]: value,
        },
      },
    }));
  };

  const handleSaveManual = () => {
    if (!activeDay) return;

    const defaultBw = weightUnit === "lbs" ? 175 : 80;
    const dateStr = new Date(selectedDate).toISOString();
    const currentBodyWeight = getClosestBodyWeight(dateStr, bodyWeightEntries, defaultBw);

    let totalTonnage = 0;
    const sessionExercises: WorkoutSession["exercises"] = [];

    activeDay.exercises.forEach((ex) => {
      const exProgress = progress[ex.id];
      if (!exProgress) return;

      const sets: WorkoutSession["exercises"][0]["sets"] = [];
      ex.sets.forEach((set) => {
        const s = exProgress[set.id];
        if (s && (s.loggedWeight || s.loggedReps)) {
          sets.push({
            setId: set.id,
            targetReps: set.targetReps,
            loggedWeight: s.loggedWeight,
            loggedReps: s.loggedReps,
            completed: true,
            completedAt: new Date(selectedDate).getTime(),
          });

          // update tonnage
          const weight = resolveWeight(s.loggedWeight, currentBodyWeight);
          const reps = parseFloat(s.loggedReps) || 0;
          totalTonnage += weight * reps;
        }
      });

      if (sets.length > 0) {
        sessionExercises.push({
          exerciseId: ex.id,
          name: ex.name,
          type: ex.type,
          sets,
        });
      }
    });

    if (sessionExercises.length === 0) {
      alert("Please enter at least one set to save the session.");
      return;
    }

    const session: WorkoutSession = {
      id: `${activeDay.id}-${new Date(selectedDate).getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      dayId: activeDay.id,
      dayName: activeDay.name,
      bodyWeightSnapshot: currentBodyWeight,
      totalTonnage: Math.round(totalTonnage * 100) / 100,
      duration: parseInt(durationMinutes) * 60 || 0,
      exercises: sessionExercises,
    };

    onAddSessions([session]);
    onClose();
  };

  const handleSaveDayJson = () => {
    if (!activeDay) return;

    let parsed: Record<string, { weight: number | string; reps: number | string }[]>;
    try {
      parsed = JSON.parse(dayJsonInput);
    } catch {
      setDayJsonError("Invalid JSON format. Please ensure it follows the format of the sample.");
      return;
    }

    const defaultBw = weightUnit === "lbs" ? 175 : 80;
    const dateStr = new Date(selectedDate).toISOString();
    const currentBodyWeight = getClosestBodyWeight(dateStr, bodyWeightEntries, defaultBw);

    let totalTonnage = 0;
    const sessionExercises: WorkoutSession["exercises"] = [];

    activeDay.exercises.forEach((ex) => {
      const key = Object.keys(parsed).find(k => k.toLowerCase() === ex.name.toLowerCase());
      if (!key) return;

      const setsData = parsed[key];
      if (!Array.isArray(setsData)) return;

      const sets: WorkoutSession["exercises"][0]["sets"] = [];
      ex.sets.forEach((set, idx) => {
        const s = setsData[idx];
        if (s && (s.weight !== undefined || s.reps !== undefined)) {
          sets.push({
            setId: set.id,
            targetReps: set.targetReps,
            loggedWeight: String(s.weight || ""),
            loggedReps: String(s.reps || ""),
            completed: true,
            completedAt: new Date(selectedDate).getTime(),
          });

          const weightNum = resolveWeight(String(s.weight || ""), currentBodyWeight);
          const repsNum = parseFloat(String(s.reps || "")) || 0;
          totalTonnage += weightNum * repsNum;
        }
      });

      if (sets.length > 0) {
        sessionExercises.push({
          exerciseId: ex.id,
          name: ex.name,
          type: ex.type,
          sets,
        });
      }
    });

    if (sessionExercises.length === 0) {
      alert("No matching exercises found. Ensure exercise names match the Day template exactly.");
      return;
    }

    const session: WorkoutSession = {
      id: `${activeDay.id}-${new Date(selectedDate).getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      dayId: activeDay.id,
      dayName: activeDay.name,
      bodyWeightSnapshot: currentBodyWeight,
      totalTonnage: Math.round(totalTonnage * 100) / 100,
      duration: parseInt(durationMinutes) * 60 || 0,
      exercises: sessionExercises,
    };

    onAddSessions([session]);
    onClose();
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const arr = Array.isArray(parsed) ? parsed : [parsed];

      // Basic validation
      for (const item of arr) {
        if (!item.id || !item.date || !item.dayId || !Array.isArray(item.exercises)) {
          throw new Error("Invalid session format. Missing required fields.");
        }
      }

      onAddSessions(arr as WorkoutSession[]);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setJsonError(err.message);
      } else {
        setJsonError("Invalid JSON");
      }
    }
  };

  const handleLoadSampleJson = () => {
    const sample: WorkoutSession[] = [
      {
        id: `sample-${Date.now()}`,
        date: new Date().toISOString(),
        dayId: workoutTemplate[0]?.id || "day-1",
        dayName: workoutTemplate[0]?.name || "Sample Day",
        bodyWeightSnapshot: 80,
        totalTonnage: 1200,
        duration: 2700,
        exercises: [
          {
            exerciseId: "sample-ex-1",
            name: "Bench Press",
            type: "strength",
            sets: [
              {
                setId: "set-1",
                targetReps: "5",
                loggedWeight: "100",
                loggedReps: "5",
                completed: true
              }
            ]
          }
        ]
      }
    ];
    setJsonInput(JSON.stringify(sample, null, 2));
    setJsonError("");
  };

  const handleLoadDaySampleJson = () => {
    if (!activeDay) return;
    const sampleObj: Record<string, { weight: number | string; reps: number | string }[]> = {};
    activeDay.exercises.forEach(ex => {
      sampleObj[ex.name] = ex.sets.map(() => ({ weight: "", reps: "" }));
    });
    setDayJsonInput(JSON.stringify(sampleObj, null, 2));
    setDayJsonError("");
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-4 sm:p-0"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up flex flex-col"
      >
        <div className="border-b border-white/6 px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-black text-white tracking-wide flex items-center gap-2">
              <DatabaseBackup size={18} className="text-lime-400" />
              Add Past Session
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/7"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setMode("manual")}
              className={cn(
                "flex-[1.2] py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all px-1",
                mode === "manual"
                  ? "bg-lime-400/15 border border-lime-400/30 text-lime-400"
                  : "bg-white/4 border border-white/7 text-neutral-500 hover:text-neutral-300"
              )}
            >
              Inputs
            </button>
            <button
              onClick={() => setMode("day-json")}
              className={cn(
                "flex-[1.2] py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all px-1",
                mode === "day-json"
                  ? "bg-lime-400/15 border border-lime-400/30 text-lime-400"
                  : "bg-white/4 border border-white/7 text-neutral-500 hover:text-neutral-300"
              )}
            >
              Day JSON
            </button>
            <button
              onClick={() => setMode("json")}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all px-1",
                mode === "json"
                  ? "bg-lime-400/15 border border-lime-400/30 text-lime-400"
                  : "bg-white/4 border border-white/7 text-neutral-500 hover:text-neutral-300"
              )}
            >
              Backup JSON
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 overscroll-contain max-h-[75vh]">
          {mode !== "json" && activeDay && (
            <div className="flex flex-col gap-5 mb-5">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 block">
                    Mins
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 text-center uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 block">
                  Workout Day
                </label>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                  {workoutTemplate.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDayId(day.id)}
                      className={cn(
                        "shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border",
                        day.id === selectedDayId
                          ? "bg-white border-white text-black"
                          : "bg-white/4 border-white/8 text-neutral-400"
                      )}
                    >
                      D{day.dayNumber} - {day.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === "manual" && activeDay && (
            <div className="flex flex-col gap-4 mt-2">
                {activeDay.exercises.map((ex) => (
                  <div key={ex.id} className="bg-white/3 border border-white/5 rounded-2xl p-3.5">
                    <h4 className="text-[13px] font-black tracking-wide text-white mb-3">
                      {ex.name}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {ex.sets.map((set, idx) => (
                        <div key={set.id} className="flex gap-2">
                          <div className="w-8 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-neutral-600">
                              {idx + 1}
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="Weight"
                            value={progress[ex.id]?.[set.id]?.loggedWeight || ""}
                            onChange={(e) =>
                              handleUpdateSet(ex.id, set.id, "loggedWeight", e.target.value)
                            }
                            className="w-full bg-[#111] border border-white/6 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-lime-400/40 placeholder-neutral-700"
                          />
                          <input
                            type="text"
                            placeholder="Reps"
                            value={progress[ex.id]?.[set.id]?.loggedReps || ""}
                            onChange={(e) =>
                              handleUpdateSet(ex.id, set.id, "loggedReps", e.target.value)
                            }
                            className="w-full bg-[#111] border border-white/6 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-lime-400/40 placeholder-neutral-700"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          )}

          {mode === "day-json" && activeDay && (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block">
                  Paste sets for {activeDay.name}
                </label>
                <button
                  type="button"
                  onClick={handleLoadDaySampleJson}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1.5 rounded-lg transition-all hover:bg-sky-400/20 active:scale-95"
                >
                  <FileJson size={12} />
                  Load Template
                </button>
              </div>
              <textarea
                value={dayJsonInput}
                onChange={(e) => {
                  setDayJsonInput(e.target.value);
                  setDayJsonError("");
                }}
                className="w-full h-64 bg-white/5 border border-white/8 rounded-2xl p-4 text-[11px] font-mono font-medium text-white/90 outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 resize-none"
                placeholder={'{\n  "Exercise Name": [\n    {"weight": 100, "reps": 10}\n  ]\n}'}
              />
              {dayJsonError && (
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                  {dayJsonError}
                </p>
              )}
            </div>
          )}

          {mode === "json" && (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block">
                  Paste WorkoutSession JSON
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleJson}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1.5 rounded-lg transition-all hover:bg-sky-400/20 active:scale-95"
                >
                  <FileJson size={12} />
                  Load Sample
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError("");
                }}
                className="w-full h-64 bg-white/5 border border-white/8 rounded-2xl p-4 text-[11px] font-mono font-medium text-white/90 outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 resize-none"
                placeholder={'[{\n  "id": "...",\n  "date": "...",\n  "dayId": "...",\n  "exercises": []\n}]'}
              />
              {jsonError && (
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                  {jsonError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/6 shrink-0 bg-[#0e0e0e]">
          <button
            onClick={mode === "manual" ? handleSaveManual : mode === "day-json" ? handleSaveDayJson : handleSaveJson}
            className="w-full flex items-center justify-center gap-2 bg-lime-400 text-neutral-950 font-black text-[13px] py-4 rounded-xl hover:bg-lime-300 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)]"
          >
            <Save size={16} />
            SAVE PAST SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
