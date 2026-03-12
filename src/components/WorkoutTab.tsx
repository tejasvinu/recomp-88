'use client';

import { useState } from "react";
import type { DayRoutine, WorkoutProgress } from "../types";
import { cn } from "../utils";
import { RotateCcw, Timer } from "lucide-react";
import ExerciseCard from "./ExerciseCard";
import { useSwipeNavigation } from "../hooks/useSwipeNavigation";

interface WorkoutTabProps {
    activeDay: DayRoutine;
    activeDayIndex: number;
    totalDays: number;
    progress: WorkoutProgress;
    exerciseNotes: Record<string, string>;
    lastSessionValues: Record<string, Record<string, Record<string, { weight: string; reps: string }>>>;
    allTimePRs: Record<string, number>;
    progressPercent: number;
    weightUnit: "kg" | "lbs";
    onSetActiveDayIndex: (fn: (i: number) => number) => void;
    onToggleSet: (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => void;
    onUpdateSetData: (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps", value: string) => void;
    onAdjustWeight: (exerciseId: string, setId: string, delta: number) => void;
    onBwFill: (exerciseId: string) => void;
    onLoadLastSession: (exerciseId: string) => void;
    onOpenExerciseInfo: (name: string) => void;
    onNoteChange: (exerciseId: string, note: string) => void;
    onShowFinishConfirm: () => void;
    onStartStretching?: () => void;
}

export default function WorkoutTab({
    activeDay,
    activeDayIndex,
    totalDays,
    progress,
    exerciseNotes,
    lastSessionValues,
    allTimePRs,
    progressPercent,
    weightUnit,
    onSetActiveDayIndex,
    onToggleSet,
    onUpdateSetData,
    onAdjustWeight,
    onBwFill,
    onLoadLastSession,
    onOpenExerciseInfo,
    onNoteChange,
    onShowFinishConfirm,
    onStartStretching,
}: WorkoutTabProps) {
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const { handleTouchStart, handleTouchEnd } = useSwipeNavigation({
        enabled: true,
        onSwipeLeft: () => {
            if (activeDayIndex < totalDays - 1) {
                onSetActiveDayIndex((i) => i + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },
        onSwipeRight: () => {
            if (activeDayIndex > 0) {
                onSetActiveDayIndex((i) => i - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },
    });

    return (
        <div
            className="flex flex-col gap-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {activeDay.exercises.map((exercise, exIdx) => (
                <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    exIdx={exIdx}
                    dayId={activeDay.id}
                    exerciseProgress={progress[activeDay.id]?.[exercise.id]}
                    exerciseNote={exerciseNotes[exercise.id] || ""}
                    isNoteOpen={expandedNoteId === exercise.id}
                    lastSessionVals={lastSessionValues[activeDay.id]?.[exercise.id]}
                    prBestWeight={allTimePRs[exercise.id] ?? 0}
                    weightUnit={weightUnit}
                    onToggleNote={() =>
                        setExpandedNoteId(expandedNoteId === exercise.id ? null : exercise.id)
                    }
                    onNoteChange={onNoteChange}
                    onToggleSet={onToggleSet}
                    onUpdateSetData={onUpdateSetData}
                    onAdjustWeight={onAdjustWeight}
                    onBwFill={onBwFill}
                    onLoadLastSession={onLoadLastSession}
                    onOpenExerciseInfo={onOpenExerciseInfo}
                />
            ))}

            {/* Finish Workout */}
            <div className="mt-6 mb-4 space-y-3">
                {activeDay.stretchingProgramId && (
                    <button
                        onClick={onStartStretching}
                        className="w-full active:scale-[0.98] flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[12px] tracking-[0.18em] uppercase transition-all border bg-white/5 hover:bg-white/8 border-white/10 text-white"
                    >
                        <Timer size={15} className="text-lime-400" />
                        Start Stretching Session
                    </button>
                )}
                <button
                    onClick={onShowFinishConfirm}
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
    );
}
