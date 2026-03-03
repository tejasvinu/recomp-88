import { useMemo, useState } from "react";
import type { WorkoutProgress } from "../types";
import { WorkoutTemplate } from "../data";
import { cn } from "../utils";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import { TrendingUp, BarChart3, Dumbbell, Flame, Award, ChevronDown } from "lucide-react";

interface ChartsViewProps {
    progress: WorkoutProgress;
}

export default function ChartsView({ progress }: ChartsViewProps) {
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
    const activeDay = WorkoutTemplate[selectedDayIdx];

    // ── Calculate per-exercise stats from saved progress ──
    const exerciseStats = useMemo(() => {
        const dayProgress = progress[activeDay.id];
        if (!dayProgress) return [];

        return activeDay.exercises
            .filter((ex) => ex.type !== "other")
            .map((exercise) => {
                const exProgress = dayProgress[exercise.id];
                if (!exProgress) return { name: exercise.name, totalVolume: 0, maxWeight: 0, avgReps: 0, sets: 0 };

                let totalVolume = 0;
                let maxWeight = 0;
                let totalReps = 0;
                let setsWithData = 0;

                Object.values(exProgress).forEach((setData) => {
                    const weight = parseFloat(setData.loggedWeight) || 0;
                    const reps = parseFloat(setData.loggedReps) || 0;
                    if (weight > 0 || reps > 0) {
                        totalVolume += weight * reps;
                        maxWeight = Math.max(maxWeight, weight);
                        totalReps += reps;
                        setsWithData++;
                    }
                });

                return {
                    name: exercise.name.length > 14 ? exercise.name.substring(0, 12) + "…" : exercise.name,
                    fullName: exercise.name,
                    totalVolume: Math.round(totalVolume),
                    maxWeight,
                    avgReps: setsWithData > 0 ? Math.round(totalReps / setsWithData) : 0,
                    sets: setsWithData,
                };
            });
    }, [progress, activeDay]);

    // ── 1RM Estimations (Epley formula: 1RM = weight × (1 + reps/30)) ──
    const estimatedMaxes = useMemo(() => {
        const dayProgress = progress[activeDay.id];
        if (!dayProgress) return [];

        return activeDay.exercises
            .filter((ex) => ex.type === "strength")
            .map((exercise) => {
                const exProgress = dayProgress[exercise.id];
                if (!exProgress) return { name: exercise.name, estimated1RM: 0, bestSet: "" };

                let best1RM = 0;
                let bestSet = "";

                Object.values(exProgress).forEach((setData) => {
                    const weight = parseFloat(setData.loggedWeight) || 0;
                    const reps = parseFloat(setData.loggedReps) || 0;
                    if (weight > 0 && reps > 0) {
                        const estimated = weight * (1 + reps / 30);
                        if (estimated > best1RM) {
                            best1RM = estimated;
                            bestSet = `${weight}kg × ${reps}`;
                        }
                    }
                });

                return {
                    name: exercise.name,
                    estimated1RM: Math.round(best1RM * 10) / 10,
                    bestSet,
                };
            })
            .filter((e) => e.estimated1RM > 0);
    }, [progress, activeDay]);

    // ── Total volume per day summary ──
    const dayVolumeSummary = useMemo(() => {
        return WorkoutTemplate.filter((d) => d.id !== "day-7").map((day) => {
            const dayProgress = progress[day.id];
            let totalVolume = 0;
            if (dayProgress) {
                Object.values(dayProgress).forEach((exProgress) => {
                    Object.values(exProgress).forEach((setData) => {
                        const weight = parseFloat(setData.loggedWeight) || 0;
                        const reps = parseFloat(setData.loggedReps) || 0;
                        totalVolume += weight * reps;
                    });
                });
            }
            return {
                name: `D${day.dayNumber}`,
                fullName: day.name,
                volume: Math.round(totalVolume),
            };
        });
    }, [progress]);

    const totalWeeklyVolume = dayVolumeSummary.reduce((acc, d) => acc + d.volume, 0);
    const hasAnyData = exerciseStats.some((e) => e.totalVolume > 0) || totalWeeklyVolume > 0;

    return (
        <div className="flex flex-col gap-5 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center">
                    <BarChart3 size={20} className="text-lime-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-tight">Progression</h2>
                    <p className="text-xs text-neutral-500 font-medium">Volume, tonnage & estimated 1RM tracking</p>
                </div>
            </div>

            {/* ═══ Weekly Volume Overview ═══ */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame size={16} className="text-lime-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Tonnage</h3>
                    </div>
                    <span className="text-lg font-black text-lime-400 tabular-nums">
                        {totalWeeklyVolume.toLocaleString()} <span className="text-xs text-neutral-500 font-medium">kg</span>
                    </span>
                </div>

                {totalWeeklyVolume > 0 ? (
                    <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dayVolumeSummary} barSize={24}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="name" tick={{ fill: "#737373", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: 12, fontSize: 12 }}
                                    labelStyle={{ color: "#a3e635", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 10 }}
                                    formatter={(value: unknown) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                                    labelFormatter={(label: unknown) => {
                                        const day = dayVolumeSummary.find((d) => d.name === String(label));
                                        return day ? day.fullName : String(label);
                                    }}
                                    cursor={{ fill: "rgba(163,230,53,0.05)" }}
                                />
                                <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                                    {dayVolumeSummary.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.volume > 0 ? "#a3e635" : "#262626"} fillOpacity={entry.volume > 0 ? 0.8 : 0.3} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message="Log weights & reps in the tracker to see your weekly tonnage chart" />
                )}
            </div>

            {/* ═══ Day Selector ═══ */}
            <div className="relative">
                <button
                    onClick={() => setDayDropdownOpen(!dayDropdownOpen)}
                    className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-left hover:bg-neutral-800/50 transition-colors"
                >
                    <span className="text-sm font-bold text-white">
                        Day {activeDay.dayNumber}: <span className="text-lime-400">{activeDay.name}</span>
                    </span>
                    <ChevronDown size={16} className={cn("text-neutral-500 transition-transform", dayDropdownOpen && "rotate-180")} />
                </button>
                {dayDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden z-20 shadow-2xl">
                        {WorkoutTemplate.filter((d) => d.id !== "day-7").map((day, idx) => (
                            <button
                                key={day.id}
                                onClick={() => { setSelectedDayIdx(idx); setDayDropdownOpen(false); }}
                                className={cn(
                                    "w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-b-0",
                                    selectedDayIdx === idx ? "text-lime-400 bg-lime-400/5" : "text-neutral-300"
                                )}
                            >
                                Day {day.dayNumber}: {day.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ Per-Exercise Volume Breakdown ═══ */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Dumbbell size={16} className="text-lime-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Exercise Volume</h3>
                </div>

                {exerciseStats.some((e) => e.totalVolume > 0) ? (
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={exerciseStats.filter((e) => e.totalVolume > 0)} barSize={20} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                                <XAxis type="number" tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={85} tick={{ fill: "#d4d4d4", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: 12, fontSize: 12 }}
                                    labelStyle={{ color: "#fff", fontWeight: 800, fontSize: 11 }}
                                    formatter={(value: unknown) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                                    cursor={{ fill: "rgba(163,230,53,0.05)" }}
                                />
                                <Bar dataKey="totalVolume" fill="#a3e635" radius={[0, 6, 6, 0]} fillOpacity={0.8} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState message={`No data logged for ${activeDay.name} yet`} />
                )}

                {/* Stat Cards Row */}
                {exerciseStats.some((e) => e.totalVolume > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <StatCard label="Total Volume" value={`${exerciseStats.reduce((a, e) => a + e.totalVolume, 0).toLocaleString()}`} unit="kg" />
                        <StatCard label="Top Weight" value={`${Math.max(...exerciseStats.map((e) => e.maxWeight))}`} unit="kg" />
                        <StatCard label="Logged Sets" value={`${exerciseStats.reduce((a, e) => a + e.sets, 0)}`} unit="sets" />
                    </div>
                )}
            </div>

            {/* ═══ Estimated 1RM Section ═══ */}
            {estimatedMaxes.length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={16} className="text-lime-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Estimated 1RM</h3>
                        <span className="text-[9px] text-neutral-500 font-medium uppercase ml-auto">Epley Formula</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {estimatedMaxes.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                                <div>
                                    <p className="text-sm font-bold text-white">{entry.name}</p>
                                    <p className="text-[11px] text-neutral-500">Best set: {entry.bestSet}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-lime-400 tabular-nums">{entry.estimated1RM}</span>
                                    <span className="text-xs text-neutral-500 font-medium ml-1">kg</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-3 text-center font-medium">
                        1RM = Weight × (1 + Reps ÷ 30) · Most accurate for 1-10 rep sets
                    </p>
                </div>
            )}

            {/* ═══ No Data State ═══ */}
            {!hasAnyData && (
                <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-2xl p-8 text-center">
                    <TrendingUp size={32} className="text-neutral-700 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-500 mb-1">No progression data yet</p>
                    <p className="text-xs text-neutral-600">Log your weights and reps in the workout tracker to see your progression charts, volume analysis, and estimated 1RM projections here.</p>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────
function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
    return (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-center">
            <p className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 mb-1">{label}</p>
            <p className="text-base font-black text-white tabular-nums leading-tight">
                {value}
                <span className="text-[10px] text-neutral-500 font-medium ml-0.5">{unit}</span>
            </p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-8 text-center">
            <p className="text-xs text-neutral-600 font-medium">{message}</p>
        </div>
    );
}
