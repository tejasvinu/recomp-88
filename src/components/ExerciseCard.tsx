'use client';

import { memo } from "react";
import type { Exercise, SavedSetState } from "../types";
import { cn } from "../utils";
import { Info, FileText, History, Plus, Trash2, TrendingUp, Zap } from "lucide-react";
import { findWikiEntry } from "../wikiData";
import { getExerciseSetsWithExtras, isExtraSetState } from "../data";
import SetRow, { SET_ROW_GRID } from "./SetRow";
import { Card, Chip, ChipButton, IconButton } from "./ui/primitives";
import { useWorkoutActions } from "./workout/WorkoutActionsContext";

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
    progressionHint?: string | null;
    onToggleNote: () => void;
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
    progressionHint,
    onToggleNote,
}: ExerciseCardProps) {
    const {
        noteChange: onNoteChange,
        bwFill: onBwFill,
        loadLastSession: onLoadLastSession,
        openExerciseInfo: onOpenExerciseInfo,
        openExerciseHistory: onOpenExerciseHistory,
        addExtraSet: onAddExtraSet,
        removeExtraSet: onRemoveExtraSet,
    } = useWorkoutActions();
    const hasWikiEntry = !!findWikiEntry(exercise.name);
    const hasLastSession = !!lastSessionVals;
    const hasNote = !!exerciseNote?.trim();
    const visibleSets = getExerciseSetsWithExtras(exercise, exerciseProgress);
    const plannedSetIds = new Set(exercise.sets.map((set) => set.id));
    const plannedSetsComplete =
        exercise.sets.length > 0 &&
        exercise.sets.every((set) => !!exerciseProgress?.[set.id]?.completed);
    const extraSetCount = visibleSets.filter((set) =>
        !plannedSetIds.has(set.id) && isExtraSetState(set.id, exerciseProgress?.[set.id])
    ).length;

    const isBwActive =
        visibleSets.every(
            (set) => (exerciseProgress?.[set.id]?.loggedWeight ?? "").startsWith("BW")
        ) && visibleSets.length > 0;

    return (
        <Card className="p-3 min-[360px]:p-4 flex flex-col gap-3">
            {/* Exercise Header */}
            <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-caption font-mono font-bold text-neutral-500">
                    {exIdx + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <h2
                        className="text-[17px] font-bold text-white tracking-wide leading-snug cursor-pointer hover:text-accent-400 transition-colors"
                        onClick={() => onOpenExerciseHistory?.(exercise.id, exercise.name)}
                    >
                        {exercise.name}
                    </h2>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                        {exercise.type !== "other" && (
                            <Chip tone={exercise.type === "strength" ? "strength" : "info"}>
                                {exercise.type === "strength" ? "Strength" : "Hypertrophy"}
                            </Chip>
                        )}
                        {exercise.details && (
                            <Chip className="font-bold tracking-wider">{exercise.details}</Chip>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton
                        shape="round"
                        hover="accent"
                        onClick={() => onOpenExerciseHistory?.(exercise.id, exercise.name)}
                        aria-label={`View history and PRs for ${exercise.name}`}
                        title="Exercise history & PRs"
                    >
                        <TrendingUp size={14} />
                    </IconButton>
                    {hasWikiEntry && (
                        <IconButton shape="round" hover="accent" onClick={() => onOpenExerciseInfo(exercise.name)} aria-label={`View info for ${exercise.name}`}>
                            <Info size={15} />
                        </IconButton>
                    )}
                    {exercise.type !== "other" && (
                        <IconButton
                            shape="round"
                            hover="accent"
                            active={isNoteOpen || hasNote}
                            onClick={onToggleNote}
                            className="relative"
                            aria-label={`${isNoteOpen ? "Close" : "Open"} notes for ${exercise.name}`}
                            aria-expanded={isNoteOpen}
                        >
                            <FileText size={14} />
                            {hasNote && !isNoteOpen && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-400 rounded-full" />
                            )}
                        </IconButton>
                    )}
                    {exercise.type !== "other" && hasLastSession && (
                        <IconButton shape="round" hover="info" onClick={() => onLoadLastSession(exercise.id)} aria-label={`Load last session values for ${exercise.name}`}>
                            <History size={14} />
                        </IconButton>
                    )}
                </div>
            </div>

            {/* Inline Progression Hint */}
            {progressionHint && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-400/10 border border-accent-400/25 text-accent-400 text-caption font-semibold">
                    <Zap size={13} className="shrink-0 text-accent-400 fill-accent-400/30" />
                    <span className="leading-snug">{progressionHint}</span>
                </div>
            )}

            {/* Column Headers */}
            {exercise.type !== "other" && (
                <div className={cn("grid gap-1.5 px-1.5 items-center text-micro font-bold text-neutral-600 uppercase tracking-[0.15em] text-center", SET_ROW_GRID)}>
                    <div className="text-left">#</div>
                    <div className="flex items-center justify-center gap-2">
                        {isBwActive ? "load" : weightUnit}
                        <ChipButton
                            active={isBwActive}
                            onClick={() => onBwFill(exercise.id)}
                            className="px-2.5 py-1"
                            aria-label="Toggle bodyweight for all sets"
                        >
                            BW
                        </ChipButton>
                    </div>
                    <div>reps</div>
                    <div />
                </div>
            )}

            {/* Set Rows */}
            {visibleSets.map((set, setIdx) => {
                const setData = exerciseProgress?.[set.id];
                const weightVal = setData?.loggedWeight || "";
                const isBwSet = weightVal.startsWith("BW");
                const isExtraSet = !plannedSetIds.has(set.id) && isExtraSetState(set.id, setData);
                const extraSetNumber = isExtraSet
                    ? visibleSets
                        .slice(0, setIdx + 1)
                        .filter((item) => !plannedSetIds.has(item.id)).length
                    : 0;

                return (
                    <div key={set.id} className="flex flex-col gap-1">
                        <SetRow
                            set={set}
                            setIdx={setIdx}
                            setLabel={isExtraSet ? `E${extraSetNumber}` : undefined}
                            exerciseId={exercise.id}
                            exerciseType={exercise.type}
                            dayId={dayId}
                            setProgress={setData}
                            lastVals={lastSessionVals?.[set.id]}
                            prBest={prBestWeight}
                            isBwSet={isBwSet}
                            weightUnit={weightUnit}
                        />
                        {isExtraSet && (
                            <button
                                type="button"
                                onClick={() => onRemoveExtraSet(dayId, exercise.id, set.id)}
                                className="self-end flex items-center gap-1.5 px-3 py-2 rounded-lg border border-danger-400/15 bg-danger-400/6 text-mini font-black uppercase tracking-widest text-danger-300/80 hover:bg-danger-400/12 hover:text-danger-300 transition-all"
                                aria-label={`Remove extra set ${extraSetNumber}`}
                            >
                                <Trash2 size={10} />
                                Remove Extra
                            </button>
                        )}
                    </div>
                );
            })}

            {exercise.type !== "other" && (
                <div className="border-t border-white/5 pt-3 mt-1">
                    <button
                        type="button"
                        onClick={() => onAddExtraSet(dayId, exercise.id)}
                        disabled={!plannedSetsComplete}
                        className={cn(
                            "w-full active:scale-[0.98] flex items-center justify-center gap-2 py-2.5 rounded-xl border text-mini font-black uppercase tracking-[0.16em] transition-all",
                            plannedSetsComplete
                                ? "bg-accent-400/10 border-accent-400/25 text-accent-400 hover:bg-accent-400/16"
                                : "bg-white/3 border-white/6 text-neutral-600 cursor-not-allowed"
                        )}
                    >
                        <Plus size={12} />
                        {plannedSetsComplete ? "Add Extra Set" : "Complete Planned Sets First"}
                    </button>
                    <p className="text-micro text-neutral-600 font-medium mt-1.5 px-1 text-center uppercase tracking-wider">
                        {extraSetCount > 0
                            ? `${extraSetCount} extra set${extraSetCount === 1 ? "" : "s"} in this session`
                            : "Extra sets copy your last load and save only to this session"}
                    </p>
                </div>
            )}

            {/* Notes section */}
            {isNoteOpen && (
                <div className="border-t border-white/5 pt-3 mt-1">
                    <textarea
                        value={exerciseNote || ""}
                        onChange={(e) => onNoteChange(exercise.id, e.target.value)}
                        placeholder="Add notes for this exercise… (cues, feel, adjustments)"
                        rows={3}
                        className="w-full bg-white/4 border border-white/7 rounded-xl p-3 text-small text-neutral-200 placeholder-neutral-600 outline-none focus:ring-1 focus:ring-accent-400/30 focus:border-accent-400/20 resize-none font-medium leading-relaxed transition-all"
                        aria-label={`Notes for ${exercise.name}`}
                    />
                    <p className="text-micro text-neutral-700 font-medium mt-1.5 px-1 uppercase tracking-wider">
                        Saved automatically
                    </p>
                </div>
            )}
        </Card>
    );
});
