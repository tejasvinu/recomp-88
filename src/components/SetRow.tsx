'use client';

import { memo } from "react";
import type { SetData, SavedSetState } from "../types";
import { cn } from "../utils";
import { Check, Minus, Plus } from "lucide-react";

interface SetRowProps {
    set: SetData;
    setIdx: number;
    exerciseId: string;
    exerciseType: "strength" | "hypertrophy" | "other";
    dayId: string;
    setProgress: SavedSetState | undefined;
    lastVals: { weight: string; reps: string } | undefined;
    prBest: number;
    isBwSet: boolean;
    weightUnit: "kg" | "lbs";
    onToggleSet: (dayId: string, exerciseId: string, setId: string, restType: "strength" | "hypertrophy" | "other") => void;
    onUpdateSetData: (dayId: string, exerciseId: string, setId: string, field: "loggedWeight" | "loggedReps", value: string) => void;
    onAdjustWeight: (exerciseId: string, setId: string, delta: number) => void;
}

export default memo(function SetRow({
    set,
    setIdx,
    exerciseId,
    exerciseType,
    dayId,
    setProgress,
    lastVals,
    prBest,
    isBwSet,
    weightUnit,
    onToggleSet,
    onUpdateSetData,
    onAdjustWeight,
}: SetRowProps) {
    const isCompleted = setProgress?.completed || false;
    const weightVal = setProgress?.loggedWeight || "";
    const weightPlaceholder = lastVals?.weight || "—";
    const repsPlaceholder = lastVals?.reps || set.targetReps;

    // PR detection
    const currentWeight = parseFloat(weightVal);
    const isPR =
        !isBwSet && !isNaN(currentWeight) && currentWeight > 0 && currentWeight > prBest;

    return (
        <div
            className={cn(
                "grid gap-2 items-center px-2 py-2 rounded-xl border transition-all duration-300",
                exerciseType !== "other"
                    ? "grid-cols-[20px_1fr_1fr_44px]"
                    : "grid-cols-[1fr_44px]",
                isCompleted
                    ? "bg-lime-400/7 border-lime-400/25"
                    : "bg-white/3 border-white/5"
            )}
        >
            {exerciseType !== "other" && (
                <div
                    className={cn(
                        "text-[11px] font-mono font-bold text-center tabular-nums",
                        isCompleted ? "text-lime-400" : "text-neutral-600"
                    )}
                >
                    {setIdx + 1}
                </div>
            )}

            {exerciseType !== "other" && (
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => onAdjustWeight(exerciseId, set.id, weightUnit === "lbs" ? -5 : -2.5)}
                        className="shrink-0 w-5 h-8 flex items-center justify-center rounded-md bg-white/4 border border-white/7 text-neutral-500 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                        aria-label={`Decrease weight by ${weightUnit === "lbs" ? 5 : 2.5} ${weightUnit}`}
                    >
                        <Minus size={9} />
                    </button>
                    <div className="relative flex-1 min-w-0 flex items-center">
                        {isBwSet && (
                            <span className="absolute left-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest pointer-events-none">
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
                                "w-full bg-white/6 border text-center font-mono font-medium outline-none rounded-lg py-2 px-1 text-sm transition-all text-white placeholder-neutral-600 focus:ring-1 focus:ring-lime-400/40 focus:bg-white/9",
                                isPR
                                    ? "border-yellow-400/50 bg-yellow-400/5 focus:border-yellow-400/60"
                                    : "border-white/8 focus:border-lime-400/30",
                                isCompleted && "text-lime-100/90",
                                isBwSet && "pl-[22px] text-left"
                            )}
                            aria-label={`Weight for set ${setIdx + 1}`}
                        />
                        {isPR && (
                            <span className="absolute -top-2 right-0 text-[8px] font-black bg-yellow-400 text-neutral-900 px-1 py-px rounded-sm leading-tight tracking-wide pointer-events-none">
                                PR
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => onAdjustWeight(exerciseId, set.id, weightUnit === "lbs" ? 5 : 2.5)}
                        className="shrink-0 w-5 h-8 flex items-center justify-center rounded-md bg-white/4 border border-white/7 text-neutral-500 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                        aria-label={`Increase weight by ${weightUnit === "lbs" ? 5 : 2.5} ${weightUnit}`}
                    >
                        <Plus size={9} />
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
                        "w-full bg-white/6 border border-white/8 text-center font-mono font-medium outline-none rounded-lg py-2 px-2 text-sm transition-all placeholder-neutral-600 focus:ring-1 focus:ring-lime-400/40 focus:bg-white/9 focus:border-lime-400/30",
                        isCompleted ? "text-lime-400" : "text-white"
                    )}
                    aria-label={`Reps for set ${setIdx + 1}`}
                />
            )}

            {exerciseType === "other" && (
                <div className="text-[11px] font-semibold text-neutral-400 px-1 uppercase tracking-wider">
                    Mark complete
                </div>
            )}

            <button
                onClick={() => onToggleSet(dayId, exerciseId, set.id, exerciseType)}
                className={cn(
                    "w-11 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 border",
                    isCompleted
                        ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_2px_12px_rgba(163,230,53,0.35)]"
                        : "bg-white/4 text-neutral-600 border-white/7 hover:bg-white/8 hover:text-white"
                )}
                aria-label={isCompleted ? `Unmark set ${setIdx + 1} as complete` : `Mark set ${setIdx + 1} as complete`}
                aria-pressed={isCompleted}
            >
                <Check strokeWidth={isCompleted ? 3.5 : 2} size={17} />
            </button>
        </div>
    );
});
