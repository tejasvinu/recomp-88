'use client';

import { memo, useState } from "react";
import type { SetData, SavedSetState, SetType } from "../types";
import { cn } from "../utils";
import { Check, Minus, Plus } from "lucide-react";
import { useWorkoutActions } from "./workout/WorkoutActionsContext";

const SET_TYPES: { value: SetType; label: string; short: string; color: string }[] = [
    { value: "working", label: "Working", short: "W", color: "bg-accent-400/15 text-accent-400 border-accent-400/30" },
    { value: "warmup", label: "Warmup", short: "WU", color: "bg-neutral-400/10 text-neutral-400 border-neutral-500/25" },
    { value: "drop", label: "Drop", short: "D", color: "bg-warn-400/15 text-warn-400 border-warn-400/30" },
    { value: "failure", label: "Failure", short: "F", color: "bg-danger-400/15 text-danger-400 border-danger-400/30" },
];

/** Column template shared with the header row in ExerciseCard. */
export const SET_ROW_GRID = "grid-cols-[28px_minmax(0,1.6fr)_minmax(0,0.8fr)_44px]";

const RPE_VALUES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

const getRpeColor = (rpe: number) => {
    if (rpe <= 7) return "text-accent-400 bg-accent-400/12 border-accent-400/25";
    if (rpe <= 8) return "text-warn-300 bg-warn-400/12 border-warn-400/25";
    if (rpe <= 9) return "text-orange-400 bg-orange-400/12 border-orange-400/25";
    return "text-danger-400 bg-danger-400/12 border-danger-400/25";
};

interface SetRowProps {
    set: SetData;
    setIdx: number;
    setLabel?: string;
    exerciseId: string;
    exerciseType: "strength" | "hypertrophy" | "other";
    dayId: string;
    setProgress: SavedSetState | undefined;
    lastVals: { weight: string; reps: string } | undefined;
    prBest: number;
    isBwSet: boolean;
    weightUnit: "kg" | "lbs";
}

export default memo(function SetRow({
    set,
    setIdx,
    setLabel,
    exerciseId,
    exerciseType,
    dayId,
    setProgress,
    lastVals,
    prBest,
    isBwSet,
    weightUnit,
}: SetRowProps) {
    const { toggleSet: onToggleSet, updateSetData: onUpdateSetData, adjustWeight: onAdjustWeight } = useWorkoutActions();
    const isCompleted = setProgress?.completed || false;
    const weightVal = setProgress?.loggedWeight || "";
    const weightPlaceholder = lastVals?.weight || "—";
    const repsPlaceholder = lastVals?.reps || set.targetReps;
    const currentRpe = setProgress?.rpe;
    const currentSetType = setProgress?.setType ?? "working";

    const [showSetType, setShowSetType] = useState(false);

    // PR detection
    const currentWeight = parseFloat(weightVal);
    const isPR =
        !isBwSet && !isNaN(currentWeight) && currentWeight > 0 && currentWeight > prBest;

    const setTypeInfo = SET_TYPES.find((t) => t.value === currentSetType) ?? SET_TYPES[0];

    return (
        <div className="flex flex-col gap-0.5">
            <div
                className={cn(
                    "grid gap-1.5 items-center px-1.5 py-2 rounded-xl border transition-all duration-300",
                    exerciseType !== "other"
                        ? SET_ROW_GRID
                        : "grid-cols-[1fr_44px]",
                    isCompleted
                        ? currentSetType === "warmup"
                            ? "bg-neutral-400/5 border-neutral-500/20"
                            : "bg-accent-400/7 border-accent-400/25"
                        : "bg-white/3 border-white/5"
                )}
            >
                {exerciseType !== "other" && (
                    <button
                        onClick={() => setShowSetType((prev) => !prev)}
                        className={cn(
                            "h-8 text-caption font-mono font-bold text-center tabular-nums rounded-lg px-0.5 transition-all border",
                            setTypeInfo.color,
                            "hover:brightness-125 active:scale-90"
                        )}
                        title={`Set type: ${setTypeInfo.label} — tap to change`}
                    >
                        {currentSetType === "working" ? setLabel ?? setIdx + 1 : setTypeInfo.short}
                    </button>
                )}

                {exerciseType !== "other" && (
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => onAdjustWeight(exerciseId, set.id, weightUnit === "lbs" ? -5 : -2.5)}
                            className="shrink-0 w-6 min-[360px]:w-7 h-11 flex items-center justify-center rounded-lg bg-white/4 border border-white/7 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                            aria-label={`Decrease weight by ${weightUnit === "lbs" ? 5 : 2.5} ${weightUnit}`}
                        >
                            <Minus size={14} />
                        </button>
                        <div className="relative flex-1 min-w-0 flex items-center">
                            {isBwSet && (
                                <span className="absolute -top-2 left-0 z-10 text-nano font-black bg-neutral-300 text-neutral-900 px-1 py-px rounded-sm leading-tight tracking-wide pointer-events-none">
                                    BW
                                </span>
                            )}
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder={isBwSet && weightPlaceholder !== "—" ? weightPlaceholder.replace("BW", "").replace("+", "") : weightPlaceholder}
                                value={isBwSet ? weightVal.replace("BW", "").replace("+", "") : weightVal}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (isBwSet) {
                                        if (val && !val.startsWith("-") && !val.startsWith("+")) {
                                            val = "+" + val;
                                        }
                                        if (val === "" || val === "+" || val === "-") {
                                            onUpdateSetData(dayId, exerciseId, set.id, "loggedWeight", "BW");
                                        } else {
                                            onUpdateSetData(dayId, exerciseId, set.id, "loggedWeight", "BW" + val);
                                        }
                                    } else {
                                        onUpdateSetData(dayId, exerciseId, set.id, "loggedWeight", val);
                                    }
                                }}
                                onFocus={(e) => e.target.select()}
                                className={cn(
                                    "w-full h-11 bg-white/6 border text-center font-mono font-medium outline-none rounded-lg px-0.5 text-base transition-all text-white placeholder-neutral-600 focus:ring-1 focus:ring-accent-400/40 focus:bg-white/9",
                                    isPR
                                        ? "border-yellow-400/50 bg-yellow-400/5 focus:border-yellow-400/60"
                                        : "border-white/8 focus:border-accent-400/30",
                                    isCompleted && "text-accent-100/90",
                                )}
                                aria-label={`Weight for set ${setIdx + 1}`}
                            />
                            {isPR && (
                                <span className="absolute -top-2 right-0 z-10 text-nano font-black bg-yellow-400 text-neutral-900 px-1 py-px rounded-sm leading-tight tracking-wide pointer-events-none">
                                    PR
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => onAdjustWeight(exerciseId, set.id, weightUnit === "lbs" ? 5 : 2.5)}
                            className="shrink-0 w-6 min-[360px]:w-7 h-11 flex items-center justify-center rounded-lg bg-white/4 border border-white/7 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                            aria-label={`Increase weight by ${weightUnit === "lbs" ? 5 : 2.5} ${weightUnit}`}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                )}

                {exerciseType !== "other" && (
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder={repsPlaceholder}
                        value={setProgress?.loggedReps || ""}
                        onChange={(e) =>
                            onUpdateSetData(dayId, exerciseId, set.id, "loggedReps", e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        className={cn(
                            "w-full h-11 bg-white/6 border border-white/8 text-center font-mono font-medium outline-none rounded-lg px-1 text-base transition-all placeholder-neutral-600 focus:ring-1 focus:ring-accent-400/40 focus:bg-white/9 focus:border-accent-400/30",
                            isCompleted ? "text-accent-400" : "text-white"
                        )}
                        aria-label={`Reps for set ${setIdx + 1}`}
                    />
                )}

                {exerciseType === "other" && (
                    <div className="text-caption font-semibold text-neutral-400 px-1 uppercase tracking-wider">
                        Mark complete
                    </div>
                )}

                <button
                    onClick={() => onToggleSet(dayId, exerciseId, set.id, exerciseType)}
                    className={cn(
                        "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 border",
                        isCompleted
                            ? "bg-accent-400 text-neutral-950 border-accent-400 shadow-[0_2px_12px_color-mix(in_oklab,_var(--color-accent-400)_35%,_transparent)]"
                            : "bg-white/4 text-neutral-600 border-white/7 hover:bg-white/8 hover:text-white"
                    )}
                    aria-label={isCompleted ? `Unmark set ${setIdx + 1} as complete` : `Mark set ${setIdx + 1} as complete`}
                    aria-pressed={isCompleted}
                >
                    <Check strokeWidth={isCompleted ? 3.5 : 2} size={20} />
                </button>
            </div>

            {/* ── Set Type Selector ── */}
            {showSetType && exerciseType !== "other" && (
                <div className="flex gap-1 px-2 pb-1 animate-in slide-in-from-top-1 duration-150">
                    {SET_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => {
                                onUpdateSetData(dayId, exerciseId, set.id, "setType", type.value);
                                setShowSetType(false);
                            }}
                            className={cn(
                                "flex-1 h-9 rounded-lg text-caption font-black uppercase tracking-widest border transition-all active:scale-95",
                                currentSetType === type.value
                                    ? type.color
                                    : "bg-white/3 border-white/6 text-neutral-600 hover:text-neutral-300 hover:bg-white/6"
                            )}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── RPE Selector (shown after completing a set) ── */}
            {isCompleted && exerciseType !== "other" && (
                <div className="flex items-center gap-1 px-2 pb-1">
                    <span className="text-micro font-black uppercase tracking-widest text-neutral-600 shrink-0 mr-0.5">
                        RPE
                    </span>
                    {RPE_VALUES.map((rpe) => (
                        <button
                            key={rpe}
                            onClick={() => {
                                onUpdateSetData(
                                    dayId,
                                    exerciseId,
                                    set.id,
                                    "rpe",
                                    currentRpe === rpe ? undefined : rpe
                                );
                            }}
                            className={cn(
                                "flex-1 h-8 rounded-md text-caption font-bold tabular-nums border transition-all active:scale-90",
                                currentRpe === rpe
                                    ? getRpeColor(rpe)
                                    : "bg-white/3 border-white/6 text-neutral-600 hover:text-neutral-400 hover:bg-white/5"
                            )}
                        >
                            {rpe}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});
