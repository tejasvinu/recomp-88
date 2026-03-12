'use client';

import { memo } from "react";
import type { Exercise, SavedSetState } from "../types";
import { cn } from "../utils";
import { Info, FileText, History } from "lucide-react";
import { findWikiEntry } from "../wikiData";
import SetRow from "./SetRow";

interface ExerciseCardProps {
    exercise: Exercise;
    exIdx: number;
    dayId: string;
    exerciseProgress: Record<string, SavedSetState> | undefined;
    exerciseNote: string;
    isNoteOpen: boolean;
    lastSessionVals: Record<string, { weight: string; reps: string }> | undefined;
    prBestWeight: number;
    weightUnit: "kg" | "lbs";
    onToggleNote: () => void;
    onNoteChange: (exerciseId: string, note: string) => void;
    onToggleSet: (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => void;
    onUpdateSetData: (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps", value: string) => void;
    onAdjustWeight: (exerciseId: string, setId: string, delta: number) => void;
    onBwFill: (exerciseId: string) => void;
    onLoadLastSession: (exerciseId: string) => void;
    onOpenExerciseInfo: (name: string) => void;
}

export default memo(function ExerciseCard({
    exercise,
    exIdx,
    dayId,
    exerciseProgress,
    exerciseNote,
    isNoteOpen,
    lastSessionVals,
    prBestWeight,
    weightUnit,
    onToggleNote,
    onNoteChange,
    onToggleSet,
    onUpdateSetData,
    onAdjustWeight,
    onBwFill,
    onLoadLastSession,
    onOpenExerciseInfo,
}: ExerciseCardProps) {
    const hasWikiEntry = !!findWikiEntry(exercise.name);
    const hasLastSession = !!lastSessionVals;
    const hasNote = !!exerciseNote?.trim();

    const isBwActive =
        exercise.sets.every(
            (set) => (exerciseProgress?.[set.id]?.loggedWeight ?? "").startsWith("BW")
        ) && exercise.sets.length > 0;

    return (
        <div className="bg-neutral-900/50 border border-white/6 p-4 rounded-2xl flex flex-col gap-3 shadow-lg">
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
                        {hasWikiEntry && (
                            <button
                                onClick={() => onOpenExerciseInfo(exercise.name)}
                                className="shrink-0 w-6 h-6 bg-white/5 hover:bg-lime-400/15 rounded-full flex items-center justify-center transition-colors group border border-white/6 hover:border-lime-400/30"
                                aria-label={`View info for ${exercise.name}`}
                            >
                                <Info
                                    size={12}
                                    className="text-neutral-500 group-hover:text-lime-400 transition-colors"
                                />
                            </button>
                        )}
                        {exercise.type !== "other" && (
                            <button
                                onClick={onToggleNote}
                                className={cn(
                                    "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors border relative",
                                    isNoteOpen || hasNote
                                        ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                                        : "bg-white/5 border-white/6 text-neutral-500 hover:bg-lime-400/10 hover:text-lime-400/80 hover:border-lime-400/20"
                                )}
                                aria-label={`${isNoteOpen ? "Close" : "Open"} notes for ${exercise.name}`}
                                aria-expanded={isNoteOpen}
                            >
                                <FileText size={11} />
                                {hasNote && !isNoteOpen && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-lime-400 rounded-full" />
                                )}
                            </button>
                        )}
                        {exercise.type !== "other" && hasLastSession && (
                            <button
                                onClick={() => onLoadLastSession(exercise.id)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors border bg-white/5 border-white/6 text-neutral-500 hover:bg-sky-400/10 hover:text-sky-400 hover:border-sky-400/20"
                                aria-label={`Load last session values for ${exercise.name}`}
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
                                onClick={() => onBwFill(exercise.id)}
                                className={cn(
                                    "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border transition-all",
                                    isBwActive
                                        ? "text-lime-400 bg-lime-400/10 border-lime-400/25"
                                        : "text-neutral-600 bg-white/3 border-white/6 hover:text-neutral-400 hover:bg-white/6"
                                )}
                                aria-label="Toggle bodyweight for all sets"
                                aria-pressed={isBwActive}
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
                    <div>{isBwActive ? "load" : weightUnit}</div>
                    <div>reps</div>
                    <div />
                </div>
            )}

            {/* Set Rows */}
            {exercise.sets.map((set, setIdx) => {
                const setData = exerciseProgress?.[set.id];
                const weightVal = setData?.loggedWeight || "";
                const isBwSet = weightVal.startsWith("BW");

                return (
                    <SetRow
                        key={set.id}
                        set={set}
                        setIdx={setIdx}
                        exerciseId={exercise.id}
                        exerciseType={exercise.type}
                        dayId={dayId}
                        setProgress={setData}
                        lastVals={lastSessionVals?.[set.id]}
                        prBest={prBestWeight}
                        isBwSet={isBwSet}
                        weightUnit={weightUnit}
                        onToggleSet={onToggleSet}
                        onUpdateSetData={onUpdateSetData}
                        onAdjustWeight={onAdjustWeight}
                    />
                );
            })}

            {/* Notes section */}
            {isNoteOpen && (
                <div className="border-t border-white/5 pt-3 mt-1">
                    <textarea
                        value={exerciseNote || ""}
                        onChange={(e) => onNoteChange(exercise.id, e.target.value)}
                        placeholder="Add notes for this exercise… (cues, feel, adjustments)"
                        rows={3}
                        className="w-full bg-white/4 border border-white/7 rounded-xl p-3 text-[12px] text-neutral-200 placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 resize-none font-medium leading-relaxed transition-all"
                        aria-label={`Notes for ${exercise.name}`}
                    />
                    <p className="text-[9px] text-neutral-700 font-medium mt-1.5 px-1 uppercase tracking-wider">
                        Saved automatically
                    </p>
                </div>
            )}
        </div>
    );
});
