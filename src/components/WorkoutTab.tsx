'use client';

import { useMemo, useState, useSyncExternalStore } from "react";
import type { DayRoutine, ExerciseLinkType, WorkoutProgress } from "../types";
import { cn } from "../utils";
import { RotateCcw, Save, Timer, Zap } from "lucide-react";
import ExerciseCard from "./ExerciseCard";
import { ActionButton } from "./ui/primitives";
import { useSwipeNavigation } from "../hooks/useSwipeNavigation";

const subscribeToMount = () => () => {};
const getClientMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

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
    progressionHints?: Record<string, string | null>;
    onSetActiveDayIndex: (fn: (i: number) => number) => void;
    onShowFinishConfirm: () => void;
    onClearCheckmarks: () => void;
    onStartStretching?: (programId: string) => void;
    onOpenJustShowUp?: () => void;
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
    progressionHints,
    onSetActiveDayIndex,
    onShowFinishConfirm,
    onClearCheckmarks,
    onStartStretching,
    onOpenJustShowUp,
}: WorkoutTabProps) {
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const isMounted = useSyncExternalStore(
        subscribeToMount,
        getClientMountedSnapshot,
        getServerMountedSnapshot
    );

    const exerciseSegments = useMemo(() => {
        const segments: Array<{
            exercises: DayRoutine["exercises"];
            linkType?: ExerciseLinkType;
            startIndex: number;
        }> = [];

        let index = 0;
        while (index < activeDay.exercises.length) {
            const exercise = activeDay.exercises[index];
            if (!exercise.linkToNext) {
                segments.push({
                    exercises: [exercise],
                    startIndex: index,
                });
                index += 1;
                continue;
            }

            const linkType = exercise.linkToNext;
            let endIndex = index + 1;

            while (
                endIndex < activeDay.exercises.length &&
                activeDay.exercises[endIndex - 1]?.linkToNext === linkType
            ) {
                endIndex += 1;
            }

            segments.push({
                exercises: activeDay.exercises.slice(index, endIndex),
                linkType,
                startIndex: index,
            });
            index = endIndex;
        }

        return segments;
    }, [activeDay.exercises]);

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
            {isMounted && activeDay.primerId && (
                <ActionButton
                    tone="warn"
                    emphasis="loud"
                    icon={<Timer size={18} />}
                    onClick={() => onStartStretching?.(activeDay.primerId!)}
                    className="shadow-[0_0_20px_color-mix(in_oklab,_var(--color-warn-500)_15%,_transparent)] mt-1 mb-2"
                >
                    Start Session Primer
                </ActionButton>
            )}

            {exerciseSegments.map((segment) => {
                if (!segment.linkType || segment.exercises.length === 1) {
                    const exercise = segment.exercises[0];
                    return (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            exIdx={segment.startIndex}
                            dayId={activeDay.id}
                            exerciseProgress={progress[activeDay.id]?.[exercise.id]}
                            exerciseNote={exerciseNotes[exercise.id] || ""}
                            isNoteOpen={expandedNoteId === exercise.id}
                            lastSessionVals={lastSessionValues[activeDay.id]?.[exercise.id]}
                            prBestWeight={allTimePRs[exercise.id] ?? 0}
                            weightUnit={weightUnit}
                            progressionHint={progressionHints?.[exercise.id]}
                            onToggleNote={() =>
                                setExpandedNoteId(expandedNoteId === exercise.id ? null : exercise.id)
                            }
                        />
                    );
                }

                return (
                    <div
                        key={`${segment.exercises[0]?.id}-${segment.linkType}`}
                        className={cn(
                            "rounded-[28px] border p-3 shadow-lg",
                            segment.linkType === "superset"
                                ? "bg-accent-400/5 border-accent-400/20"
                                : "bg-info-400/5 border-info-400/20"
                        )}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "px-2.5 py-1 rounded-full border text-micro font-black uppercase tracking-[0.18em]",
                                        segment.linkType === "superset"
                                            ? "bg-accent-400/12 border-accent-400/25 text-accent-400"
                                            : "bg-info-400/12 border-info-400/25 text-info-400"
                                    )}
                                >
                                    {segment.linkType}
                                </span>
                                <span className="text-mini font-bold uppercase tracking-widest text-neutral-500">
                                    {segment.exercises.length} linked exercises
                                </span>
                            </div>
                            <p className="text-mini text-neutral-500 font-medium">
                                {segment.linkType === "superset"
                                    ? "Alternate between these blocks before moving on."
                                    : "Run these in sequence as one circuit flow."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {segment.exercises.map((exercise, localIndex) => (
                                <div key={exercise.id}>
                                    <div className="flex items-center gap-2 px-1.5 pb-2">
                                        <span
                                            className={cn(
                                                "w-6 h-6 rounded-lg border flex items-center justify-center text-mini font-black",
                                                segment.linkType === "superset"
                                                    ? "border-accent-400/25 bg-accent-400/10 text-accent-400"
                                                    : "border-info-400/25 bg-info-400/10 text-info-400"
                                            )}
                                        >
                                            {localIndex + 1}
                                        </span>
                                        <p className="text-mini font-bold uppercase tracking-[0.18em] text-neutral-500">
                                            {segment.linkType === "superset"
                                                ? "Superset Slot"
                                                : "Circuit Slot"}
                                        </p>
                                    </div>
                                    <ExerciseCard
                                        exercise={exercise}
                                        exIdx={segment.startIndex + localIndex}
                                        dayId={activeDay.id}
                                        exerciseProgress={progress[activeDay.id]?.[exercise.id]}
                                        exerciseNote={exerciseNotes[exercise.id] || ""}
                                        isNoteOpen={expandedNoteId === exercise.id}
                                        lastSessionVals={lastSessionValues[activeDay.id]?.[exercise.id]}
                                        prBestWeight={allTimePRs[exercise.id] ?? 0}
                                        weightUnit={weightUnit}
                                        progressionHint={progressionHints?.[exercise.id]}
                                        onToggleNote={() =>
                                            setExpandedNoteId(expandedNoteId === exercise.id ? null : exercise.id)
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* End-of-workout actions */}
            <div className="mt-6 mb-4 space-y-3">
                {isMounted && (
                    <ActionButton
                        tone="accent"
                        emphasis="loud"
                        icon={<Zap size={18} />}
                        onClick={onOpenJustShowUp}
                        className="shadow-[0_0_20px_color-mix(in_oklab,_var(--color-accent-400)_10%,_transparent)]"
                    >
                        Just Show Up — 15 min
                    </ActionButton>
                )}
                {isMounted && activeDay.preWorkoutStretchId && (
                    <ActionButton
                        icon={<Timer size={15} className="text-warn-400" />}
                        onClick={() => onStartStretching?.(activeDay.preWorkoutStretchId!)}
                        className="bg-warn-400/5 hover:bg-warn-400/10 border-warn-400/15 text-white"
                    >
                        Start Pre-Workout Warmup
                    </ActionButton>
                )}
                {isMounted && activeDay.finisherId && (
                    <ActionButton
                        tone="rose"
                        emphasis="loud"
                        icon={<Timer size={18} />}
                        onClick={() => onStartStretching?.(activeDay.finisherId!)}
                        className="shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    >
                        Start Session Finisher
                    </ActionButton>
                )}
                {isMounted && (activeDay.postWorkoutStretchId || activeDay.stretchingProgramId) && (
                    <ActionButton
                        tone="plain"
                        icon={<Timer size={15} className="text-accent-400" />}
                        onClick={() => onStartStretching?.((activeDay.postWorkoutStretchId || activeDay.stretchingProgramId)!)}
                    >
                        Start Post-Workout Recovery
                    </ActionButton>
                )}
                <ActionButton
                    icon={<Save size={15} className="text-accent-400" />}
                    onClick={onShowFinishConfirm}
                    className={progressPercent === 100 ? "bg-accent-400/15 hover:bg-accent-400/22 border-accent-400/40 text-accent-400" : undefined}
                >
                    Save Workout
                </ActionButton>
                <p className="text-center text-mini text-neutral-600 mt-2.5 px-6 font-medium leading-relaxed">
                    Saves this session to history, then clears checkmarks while keeping planned weights and reps.
                </p>
                <ActionButton
                    tone="ghost"
                    icon={<RotateCcw size={14} />}
                    onClick={onClearCheckmarks}
                    className="py-3 text-caption tracking-[0.16em]"
                >
                    Clear Unsaved Checkmarks
                </ActionButton>
                <p className="text-center text-micro text-neutral-700 px-6 font-medium leading-relaxed">
                    Use only when you want to restart today&apos;s checkmarks without saving a session.
                </p>
            </div>
        </div>
    );
}
