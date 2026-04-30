'use client';

import { useMemo, useState } from "react";
import type { BodyWeightEntry, SessionHistory } from "../types";
import { cn } from "../utils";
import { computeGlobalExerciseRecords } from "../services/workoutService";
import { Info, Trophy, ArrowUpDown } from "lucide-react";

type SortKey = "name" | "maxWeight" | "maxSessionTonnage";

interface ExerciseRecordsViewProps {
    sessions: SessionHistory;
    bodyWeightEntries: BodyWeightEntry[];
    weightUnit?: "kg" | "lbs";
    onOpenExercise?: (name: string) => void;
}

export default function ExerciseRecordsView({
    sessions,
    bodyWeightEntries,
    weightUnit = "kg",
    onOpenExercise,
}: ExerciseRecordsViewProps) {
    const [sortKey, setSortKey] = useState<SortKey>("name");

    const rows = useMemo(
        () =>
            computeGlobalExerciseRecords(sessions, bodyWeightEntries, weightUnit),
        [sessions, bodyWeightEntries, weightUnit],
    );

    const sorted = useMemo(() => {
        const copy = [...rows];
        if (sortKey === "name") {
            copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        } else if (sortKey === "maxWeight") {
            copy.sort((a, b) => b.maxWeight - a.maxWeight || a.name.localeCompare(b.name));
        } else {
            copy.sort(
                (a, b) =>
                    b.maxSessionTonnage - a.maxSessionTonnage ||
                    a.name.localeCompare(b.name),
            );
        }
        return copy;
    }, [rows, sortKey]);

    const formatWeight = (v: number) =>
        v % 1 === 0 ? String(v) : v.toFixed(1);

    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Trophy size={18} className="text-lime-400 shrink-0" />
                    <h2 className="text-lg font-black uppercase tracking-[0.08em] text-white">
                        Exercise records
                    </h2>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Every exercise you have logged, merged by name.{" "}
                    <span className="text-neutral-400">Max weight</span> is your heaviest single
                    set;{" "}
                    <span className="text-neutral-400">Session volume</span> is your best total{" "}
                    (weight × reps) for that lift in one workout.
                </p>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center text-[13px] text-neutral-500">
                    Finish and save a few workouts to see records here.
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600 flex items-center gap-1">
                            <ArrowUpDown size={10} />
                            Sort
                        </span>
                        {(
                            [
                                ["name", "A–Z"],
                                ["maxWeight", "Max weight"],
                                ["maxSessionTonnage", "Session volume"],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSortKey(key)}
                                className={cn(
                                    "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border transition-colors",
                                    sortKey === key
                                        ? "border-lime-400/35 bg-lime-400/12 text-lime-400"
                                        : "border-white/10 bg-white/[0.04] text-neutral-500 hover:text-neutral-300",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-white/6 bg-neutral-900/50 overflow-hidden shadow-lg">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-0 px-3 py-2 border-b border-white/6 bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.12em] text-neutral-500">
                            <span>Exercise</span>
                            <span className="text-right tabular-nums">Max</span>
                            <span className="text-right tabular-nums">Session vol.</span>
                        </div>
                        <ul className="divide-y divide-white/5 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                            {sorted.map((row) => (
                                <li
                                    key={row.name.toLowerCase()}
                                    className="grid grid-cols-[1fr_auto_auto] gap-x-2 items-center px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="min-w-0 flex items-center gap-2">
                                        <span className="text-[13px] font-bold text-neutral-100 truncate">
                                            {row.name}
                                        </span>
                                        {onOpenExercise && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenExercise(row.name)}
                                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center border border-white/8 bg-white/5 hover:bg-lime-400/15 hover:border-lime-400/25 transition-colors"
                                                title="Exercise info"
                                                aria-label={`Info for ${row.name}`}
                                            >
                                                <Info size={11} className="text-neutral-500" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-[13px] font-mono font-bold text-lime-400 tabular-nums text-right">
                                        {formatWeight(row.maxWeight)}
                                        <span className="text-[9px] text-neutral-600 font-bold ml-0.5">
                                            {weightUnit}
                                        </span>
                                    </span>
                                    <span className="text-[13px] font-mono font-semibold text-neutral-200 tabular-nums text-right">
                                        {row.maxSessionTonnage.toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-[10px] text-neutral-600 text-center">
                        Session volume is Σ (weight × reps) for that exercise in one saved session,
                        using your {weightUnit} log and bodyweight for “BW” sets.
                    </p>
                </>
            )}
        </div>
    );
}
