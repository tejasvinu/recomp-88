'use client';

import { useState } from "react";
import type {
  WorkoutProgress,
  SessionHistory,
  BodyWeightEntry,
  ExerciseWiki,
  WorkoutTemplate,
} from "../types";
import { cn, getClosestBodyWeight, resolveWeight } from "../utils";
import {
  useAnalytics,
  MUSCLE_STATUS_STYLES,
  formatSessionDateLabel,
  formatSessionTooltipLabel,
  type MuscleRecoveryStatus,
  type MuscleRegionId,
  type ActualRmTarget,
} from "../hooks/useAnalytics";
import MuscleHeatmapSvg from "./MuscleHeatmapSvg";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Dumbbell,
  Flame,
  Award,
  Info,
  History,
  ArrowUp,
  ArrowDown,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Scale,
  Clock,
} from "lucide-react";

// Re-export MUSCLE_STATUS_STYLES so MuscleHeatmapSvg (and other consumers) can import it from here
export { MUSCLE_STATUS_STYLES };

const EXERCISE_AXIS_MAX_LENGTH = 14;
const LINE_COLORS = ["#a3e635", "#38bdf8", "#f97316", "#a78bfa", "#fb923c"];

type AnalyticsViewMode = "overview" | "heatmap";
type HeatmapSide = "front" | "back";

interface ChartsViewProps {
  workoutTemplate: WorkoutTemplate;
  progress: WorkoutProgress;
  sessions: SessionHistory;
  customExercises?: ExerciseWiki[];
  onOpenExercise?: (name: string) => void;
  onDeleteSession: (id: string) => void;
  bodyWeightEntries: BodyWeightEntry[];
  onLogBodyWeight: (weight: number) => void;
  weightUnit?: "kg" | "lbs";
}

const formatExerciseAxisLabel = (value: string) =>
  value.length > EXERCISE_AXIS_MAX_LENGTH
    ? `${value.slice(0, EXERCISE_AXIS_MAX_LENGTH - 1)}…`
    : value;

const formatDuration = (seconds?: number) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
};

const formatLastHitLabel = (value: number | null) => {
  if (value === null) return "No recent hits";
  if (value < 1) return "Hit today";
  if (value < 2) return "Hit yesterday";
  return `Hit ${Math.round(value)}d ago`;
};

export default function ChartsView({
  workoutTemplate,
  progress,
  sessions,
  customExercises = [],
  onOpenExercise,
  onDeleteSession,
  bodyWeightEntries,
  onLogBodyWeight,
  weightUnit = "kg",
}: ChartsViewProps) {
  // ── UI state not related to analytics ─────────────────────────────────
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [bwInput, setBwInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [analyticsView, setAnalyticsView] = useState<AnalyticsViewMode>("overview");
  const [heatmapSide, setHeatmapSide] = useState<HeatmapSide>("front");

  // ── All analytics computation delegated to the custom hook ────────────
  const {
    trainingDays,
    selectedDayIdx,
    setSelectedDayIdx,
    activeDay,
    actualRmTarget,
    setActualRmTarget,
    exerciseStats,
    exerciseStatsById,
    estimatedMaxes,
    dayVolumeSummary,
    prHistory,
    actualRepMaxHistory,
    weekComparison,
    recentSessions,
    bwChartData,
    muscleRecovery,
    sessionTonnageTrend,
    todayBw,
    totalWeeklyVolume,
    hasAnyData,
  } = useAnalytics({
    workoutTemplate,
    progress,
    sessions,
    bodyWeightEntries,
    customExercises,
    weightUnit,
  });

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
          <BarChart3 size={22} className="text-lime-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">Progression</h2>
          <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-widest">
            Volume · tonnage · rep maxes · recovery map
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([
          { id: "overview" as AnalyticsViewMode, label: "Overview" },
          { id: "heatmap" as AnalyticsViewMode, label: "Heatmap" },
        ]).map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setAnalyticsView(view.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all",
              analyticsView === view.id
                ? "bg-lime-400/12 border-lime-400/25 text-lime-400"
                : "bg-white/4 border-white/7 text-neutral-500 hover:bg-white/7 hover:text-neutral-300"
            )}
          >
            {view.label}
          </button>
        ))}
      </div>

      {analyticsView === "heatmap" ? (
        <MuscleRecoveryHeatmapCard
          regions={muscleRecovery}
          activeSide={heatmapSide}
          onChangeSide={setHeatmapSide}
          weightUnit={weightUnit}
        />
      ) : (
        <>
          {/* Body Weight Tracker */}
          <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale size={15} className="text-lime-400" />
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">
                  Body Weight
                </h3>
              </div>
              {todayBw && (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-mono font-bold text-lime-400 tabular-nums">{todayBw.weight}</span>
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest ml-1">{weightUnit} today</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                inputMode="decimal"
                placeholder={todayBw ? String(todayBw.weight) : "e.g. 80.5"}
                value={bwInput}
                onChange={(e) => setBwInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 transition-all"
              />
              <span className="flex items-center text-[11px] font-bold text-neutral-600 shrink-0">{weightUnit}</span>
              <button
                onClick={() => {
                  const w = parseFloat(bwInput);
                  if (w > 0) {
                    onLogBodyWeight(w);
                    setBwInput("");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-lime-400/12 border border-lime-400/25 text-lime-400 font-bold text-[12px] hover:bg-lime-400/20 transition-all active:scale-95"
              >
                Log
              </button>
            </div>

            {bwChartData.length >= 2 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bwChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#525252", fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#525252", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12, fontFamily: "DM Mono, monospace" }}
                      labelStyle={{ color: "#a3e635", fontWeight: 800, fontSize: 10, letterSpacing: "0.1em" }}
                      formatter={(value: unknown) => [`${value} ${weightUnit}`, "Weight"]}
                      cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#a3e635"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#a3e635", strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="Log at least 2 entries to see your weight trend" />
            )}
          </div>

          {/* Latest-session tonnage by training day */}
          <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-lime-400" />
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Latest Session Tonnage</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-bold text-lime-400 tabular-nums">
                  {totalWeeklyVolume.toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{weightUnit}</span>
              </div>
            </div>

            {totalWeeklyVolume > 0 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayVolumeSummary} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="name" tick={{ fill: "#525252", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12, fontFamily: "DM Mono, monospace" }}
                      labelStyle={{ color: "#a3e635", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 10, letterSpacing: "0.1em" }}
                      formatter={(value: unknown) => [`${Number(value).toLocaleString()} ${weightUnit}`, "Volume"]}
                      labelFormatter={(label: unknown) => {
                        const day = dayVolumeSummary.find((d) => d.name === String(label));
                        return day ? day.fullName : String(label);
                      }}
                      cursor={{ fill: "rgba(163,230,53,0.04)" }}
                    />
                    <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                      {dayVolumeSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.volume > 0 ? "#a3e635" : "#1f1f1f"}
                          fillOpacity={entry.volume > 0 ? 0.85 : 0.4}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="Save a session for each training day to compare your latest tonnage split" />
            )}
          </div>

          {/* Week-over-week comparison */}
          {weekComparison.hasData && (
            <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-lime-400" />
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Week vs Week</h3>
                {weekComparison.change !== null && (
                  <div
                    className={cn(
                      "ml-auto flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-lg border",
                      weekComparison.change > 0
                        ? "text-lime-400 bg-lime-400/10 border-lime-400/20"
                        : weekComparison.change < 0
                          ? "text-red-400 bg-red-400/10 border-red-400/20"
                          : "text-neutral-400 bg-white/5 border-white/8"
                    )}
                  >
                    {weekComparison.change > 0 ? <ArrowUp size={11} /> : weekComparison.change < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                    {Math.abs(weekComparison.change)}%
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-lime-400/8 border border-lime-400/20 rounded-xl p-3.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-lime-400/70 mb-2">This Week</p>
                  <p className="text-xl font-mono font-bold text-lime-400 tabular-nums leading-none">
                    {weekComparison.thisWeek.toLocaleString()}
                    <span className="text-[9px] text-lime-400/60 font-bold uppercase tracking-widest ml-1">{weightUnit}</span>
                  </p>
                  <p className="text-[10px] text-lime-400/50 font-medium mt-1.5">
                    {weekComparison.thisWeekCount} session{weekComparison.thisWeekCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-white/3 border border-white/6 rounded-xl p-3.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Last Week</p>
                  <p className="text-xl font-mono font-bold text-white tabular-nums leading-none">
                    {weekComparison.lastWeek > 0 ? weekComparison.lastWeek.toLocaleString() : "—"}
                    {weekComparison.lastWeek > 0 && (
                      <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest ml-1">{weightUnit}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-neutral-600 font-medium mt-1.5">
                    {weekComparison.lastWeekCount} session{weekComparison.lastWeekCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {weekComparison.change === null && (
                <p className="text-[10px] text-neutral-600 font-medium mt-3 text-center">
                  Complete sessions across two weeks to see comparison
                </p>
              )}
            </div>
          )}

          {/* Session Tonnage Trend */}
          {sessionTonnageTrend && (
            <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-sky-400" />
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Session Tonnage Trend</h3>
                <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest ml-auto">
                  Last {sessionTonnageTrend.length} sessions
                </span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionTonnageTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="date" tick={{ fill: "#525252", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#525252", fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12, fontFamily: "DM Mono, monospace" }}
                      labelStyle={{ color: "#38bdf8", fontWeight: 800, fontSize: 10, letterSpacing: "0.1em" }}
                      formatter={(value: unknown) => [`${Number(value).toLocaleString()} ${weightUnit}`, "Tonnage"]}
                      labelFormatter={(_: unknown, payload: readonly { payload?: { dayName?: string; fullDate?: string } }[]) => {
                        const item = payload?.[0]?.payload;
                        if (!item) return "";
                        return `${item.dayName} · ${formatSessionTooltipLabel(item.fullDate ?? "")}`;
                      }}
                      cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                    />
                    <Line type="monotone" dataKey="tonnage" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeDay ? (
            <>
              {/* Day Selector */}
              <div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
                  {trainingDays.map((day, idx) => (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={cn(
                        "snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border",
                        selectedDayIdx === idx
                          ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]"
                          : "bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300"
                      )}
                    >
                      D{day.dayNumber}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mt-1.5 px-0.5">
                  {activeDay.name}
                </p>
              </div>

              {/* Per-Exercise Volume */}
              <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Dumbbell size={15} className="text-lime-400" />
                  <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Exercise Volume</h3>
                </div>

                {exerciseStats.some((entry) => entry.totalVolume > 0) ? (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={exerciseStats.filter((entry) => entry.totalVolume > 0)} barSize={18} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#525252", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          dataKey="exerciseId"
                          type="category"
                          width={82}
                          tick={{ fill: "#c4c4c4", fontSize: 10, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => formatExerciseAxisLabel(exerciseStatsById.get(String(value)) ?? String(value))}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12, fontFamily: "DM Mono, monospace" }}
                          labelStyle={{ color: "#fff", fontWeight: 800, fontSize: 11 }}
                          formatter={(value: unknown) => [`${Number(value).toLocaleString()} ${weightUnit}`, "Volume"]}
                          labelFormatter={(label: unknown) => exerciseStatsById.get(String(label)) ?? String(label)}
                          cursor={{ fill: "rgba(163,230,53,0.04)" }}
                        />
                        <Bar dataKey="totalVolume" fill="#a3e635" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message={`No data logged for ${activeDay.name} yet`} />
                )}

                {exerciseStats.some((entry) => entry.totalVolume > 0) && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <StatCard
                      label="Total Vol"
                      value={`${exerciseStats.reduce((total, entry) => total + entry.totalVolume, 0).toLocaleString()}`}
                      unit={weightUnit}
                    />
                    <StatCard
                      label="Top Weight"
                      value={`${Math.max(...exerciseStats.map((entry) => entry.maxWeight))}`}
                      unit={weightUnit}
                    />
                    <StatCard
                      label="Sets"
                      value={`${exerciseStats.reduce((total, entry) => total + entry.sets, 0)}`}
                      unit="sets"
                    />
                  </div>
                )}
              </div>

              {/* Estimated 1RM */}
              {estimatedMaxes.length > 0 && (
                <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Award size={15} className="text-lime-400" />
                    <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Estimated 1RM</h3>
                    <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest ml-auto bg-white/4 px-2 py-1 rounded-md border border-white/6">Epley</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {estimatedMaxes.map((entry) => (
                      <div key={entry.exerciseId} className="flex items-center justify-between bg-white/4 border border-white/7 rounded-xl p-3.5 hover:bg-white/7 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold text-white tracking-wide leading-snug truncate">{entry.name}</p>
                            {onOpenExercise && (
                              <button
                                onClick={() => onOpenExercise(entry.name)}
                                className="shrink-0 w-5 h-5 bg-white/5 hover:bg-lime-400/15 rounded-full flex items-center justify-center transition-colors border border-white/6 hover:border-lime-400/30 group"
                                title="View exercise info"
                              >
                                <Info size={10} className="text-neutral-500 group-hover:text-lime-400 transition-colors" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium mt-0.5 uppercase tracking-wider">
                            Best: <span className="text-neutral-300 font-mono">{entry.bestSet}</span>
                          </p>
                        </div>
                        <div className="flex items-baseline gap-0.5 shrink-0 ml-3">
                          <span className="text-[22px] font-mono font-bold text-lime-400 tabular-nums leading-none">{entry.estimated1RM}</span>
                          <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest ml-1">{weightUnit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-3 text-center font-medium">
                    1RM = weight × (1 + reps ÷ 30) · reps are capped at 15 to avoid endurance-set inflation
                  </p>
                </div>
              )}

              {/* PR Tracker */}
              {prHistory && (
                <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={15} className="text-lime-400" />
                    <h3 className="text-[12px] font-black text-white uppercase tracking-widest">PR Tracker</h3>
                    <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest ml-auto bg-white/4 px-2 py-1 rounded-md border border-white/6">
                      {sessions.filter((session) => session.dayId === activeDay.id).length} sessions
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-medium mb-4 uppercase tracking-wider">Est. 1RM over time</p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prHistory.series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis
                          dataKey="dateKey"
                          tick={{ fill: "#525252", fontSize: 9, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => {
                            const entry = prHistory.series.find((p) => p.dateKey === value);
                            return entry ? String(entry.displayDate) : formatSessionDateLabel(String(value));
                          }}
                        />
                        <YAxis tick={{ fill: "#525252", fontSize: 9 }} axisLine={false} tickLine={false} width={32} tickFormatter={(v) => `${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 11, fontFamily: "DM Mono, monospace" }}
                          labelStyle={{ color: "#a3e635", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 9, letterSpacing: "0.1em" }}
                          formatter={(value: unknown, name: unknown) => [
                            `${value} ${weightUnit}`,
                            prHistory.exercises.find((e) => e.key === name)?.label ?? String(name),
                          ]}
                          labelFormatter={(label: unknown) => formatSessionTooltipLabel(String(label))}
                          cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                        />
                        {prHistory.exercises.map((exercise, index) => (
                          <Line
                            key={exercise.key}
                            type="monotone"
                            dataKey={exercise.key}
                            stroke={LINE_COLORS[index % LINE_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3, fill: LINE_COLORS[index % LINE_COLORS.length], strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {prHistory.exercises.map((exercise, index) => (
                      <div key={exercise.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }} />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">{exercise.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actual Rep Max */}
              {activeDay.exercises.some((exercise) => exercise.type !== "other") && (
                <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={15} className="text-sky-400" />
                    <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Actual Rep Max</h3>
                    <div className="ml-auto flex gap-1">
                      {([8, 10] as const).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setActualRmTarget(target as ActualRmTarget)}
                          className={cn(
                            "px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest transition-all",
                            actualRmTarget === target
                              ? "bg-sky-400/12 border-sky-400/25 text-sky-400"
                              : "bg-white/4 border-white/8 text-neutral-500 hover:bg-white/7 hover:text-neutral-300"
                          )}
                        >
                          {target}RM
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-medium mb-4 uppercase tracking-wider">
                    Heaviest logged set with exactly {actualRmTarget} reps
                  </p>

                  {actualRepMaxHistory ? (
                    <>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={actualRepMaxHistory.series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                            <XAxis
                              dataKey="dateKey"
                              tick={{ fill: "#525252", fontSize: 9, fontWeight: 700 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => {
                                const entry = actualRepMaxHistory.series.find((p) => p.dateKey === value);
                                return entry ? String(entry.displayDate) : formatSessionDateLabel(String(value));
                              }}
                            />
                            <YAxis tick={{ fill: "#525252", fontSize: 9 }} axisLine={false} tickLine={false} width={32} tickFormatter={(v) => `${v}`} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 11, fontFamily: "DM Mono, monospace" }}
                              labelStyle={{ color: "#38bdf8", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 9, letterSpacing: "0.1em" }}
                              formatter={(value: unknown, name: unknown) => [
                                `${value} ${weightUnit}`,
                                actualRepMaxHistory.exercises.find((e) => e.key === name)?.label ?? String(name),
                              ]}
                              labelFormatter={(label: unknown) => formatSessionTooltipLabel(String(label))}
                              cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                            />
                            {actualRepMaxHistory.exercises.map((exercise, index) => (
                              <Line
                                key={exercise.key}
                                type="monotone"
                                dataKey={exercise.key}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3, fill: LINE_COLORS[index % LINE_COLORS.length], strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {actualRepMaxHistory.exercises.map((exercise, index) => (
                          <div key={exercise.key} className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }} />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">{exercise.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState message={`Log exact ${actualRmTarget}-rep top sets across multiple sessions to see this line.`} />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/2 border border-dashed border-white/8 rounded-2xl p-6 text-center">
              <p className="text-[12px] font-black text-white mb-1.5 uppercase tracking-widest">No Training Days Configured</p>
              <p className="text-[11px] text-neutral-500 font-medium leading-relaxed max-w-[280px] mx-auto">
                Add at least one strength or hypertrophy day in workout settings to unlock progression charts for your current program.
              </p>
            </div>
          )}

          {/* Recent Session History */}
          {recentSessions.length > 0 && (
            <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <History size={15} className="text-lime-400" />
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Recent Sessions</h3>
                <span className="text-[9px] text-neutral-600 font-bold ml-auto">tap to expand</span>
              </div>

              <div className="flex flex-col gap-2">
                {recentSessions.map((session) => {
                  const defaultBw = weightUnit === "lbs" ? 175 : 80;
                  const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
                  const totalVol = session.exercises.reduce(
                    (acc, ex) => acc + ex.sets.reduce((s, set) => s + resolveWeight(set.loggedWeight, bw) * (parseFloat(set.loggedReps) || 0), 0),
                    0
                  );
                  const isExpanded = expandedSessionId === session.id;
                  const isDeleteConfirm = deleteConfirmId === session.id;

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "border rounded-xl overflow-hidden transition-all",
                        isExpanded ? "bg-white/4 border-white/10" : "bg-white/3 border-white/5"
                      )}
                    >
                      <button
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
                      >
                        <div>
                          <p className="text-[13px] font-bold text-white leading-snug">{session.dayName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                              {new Date(session.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                            {session.duration && (
                              <div className="flex items-center gap-1">
                                <Clock size={9} className="text-neutral-600" />
                                <span className="text-[9px] font-mono text-neutral-600">{formatDuration(session.duration)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-[13px] font-mono font-bold text-lime-400 tabular-nums">
                              {Math.round(totalVol).toLocaleString()}{" "}
                              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">{weightUnit}</span>
                            </p>
                            <p className="text-[10px] text-neutral-600 font-medium mt-0.5">{session.exercises.length} exercises</p>
                          </div>
                          {isExpanded ? <ChevronUp size={14} className="text-neutral-500 shrink-0" /> : <ChevronDown size={14} className="text-neutral-500 shrink-0" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3.5 pb-3 border-t border-white/6 pt-3">
                          <div className="flex flex-col gap-2 mb-3">
                            {session.exercises.map((ex) => (
                              <div key={ex.exerciseId}>
                                <p className="text-[11px] font-bold text-neutral-300 mb-1">{ex.name}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.sets.map((set, i) => (
                                    <div key={set.setId} className="bg-white/5 border border-white/8 rounded-lg px-2 py-1">
                                      <span className="text-[10px] font-mono text-neutral-400">{i + 1}.{" "}</span>
                                      <span className="text-[10px] font-mono font-bold text-white">
                                        {set.completed && !set.loggedWeight && !set.loggedReps ? (
                                          <span className="text-lime-400">Completed ✓</span>
                                        ) : (
                                          <>
                                            {set.loggedWeight || "—"}
                                            {set.loggedWeight && set.loggedWeight !== "BW" ? weightUnit : ""}{" "}
                                            × {set.loggedReps || "—"}
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {isDeleteConfirm ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-neutral-400 border border-white/8 bg-white/3 hover:bg-white/7 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  onDeleteSession(session.id);
                                  setDeleteConfirmId(null);
                                  setExpandedSessionId(null);
                                }}
                                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-red-400 border border-red-400/25 bg-red-400/8 hover:bg-red-400/15 transition-all"
                              >
                                Delete session
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(session.id);
                              }}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={11} />
                              Delete this session
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasAnyData && sessions.length === 0 && trainingDays.length > 0 && (
            <div className="bg-white/2 border border-dashed border-white/8 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-white/4 border border-white/8 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-neutral-600" />
              </div>
              <p className="text-[15px] font-black text-white mb-1.5 tracking-wide">No progression data yet</p>
              <p className="text-[12px] text-neutral-500 font-medium leading-relaxed max-w-[260px] mx-auto">
                Log weights and reps in the tracker, then tap &quot;Save Workout&quot; to save your first session.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white/4 border border-white/7 rounded-xl p-3 text-center hover:bg-white/7 transition-colors">
      <p className="text-[9px] uppercase font-black tracking-widest text-neutral-500 mb-1.5 leading-none">{label}</p>
      <p className="text-[16px] font-mono font-bold text-white tabular-nums leading-none">
        {value}
        <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest ml-1">{unit}</span>
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-7 text-center">
      <p className="text-[11px] text-neutral-600 font-medium">{message}</p>
    </div>
  );
}

function MuscleRecoveryHeatmapCard({
  regions,
  activeSide,
  onChangeSide,
  weightUnit,
}: {
  regions: Array<{
    id: MuscleRegionId;
    label: string;
    volume: number;
    score: number;
    intensity: number;
    status: MuscleRecoveryStatus;
    lastHitDays: number | null;
  }>;
  activeSide: "front" | "back";
  onChangeSide: (side: "front" | "back") => void;
  weightUnit: "kg" | "lbs";
}) {
  const regionsById = new Map(regions.map((region) => [region.id, region]));
  const sideOrder: Record<"front" | "back", MuscleRegionId[]> = {
    front: ["chest", "frontShoulders", "biceps", "abs", "quads", "calves"],
    back: ["rearShoulders", "triceps", "upperBack", "lats", "lowerBack", "glutes", "hamstrings", "calves"],
  };
  const visibleRegions = sideOrder[activeSide]
    .map((rid) => regionsById.get(rid))
    .filter(Boolean) as typeof regions;
  const hasTrackedLoad = regions.some((r) => r.volume > 0);

  return (
    <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Muscle Recovery Heatmap</h3>
          <p className="text-[10px] text-neutral-500 font-medium mt-1 uppercase tracking-wider">
            Last 7 days of weighted workload in {weightUnit}
          </p>
        </div>
        <div className="flex gap-1">
          {(["front", "back"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => onChangeSide(side)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.18em] transition-all",
                activeSide === side
                  ? "bg-lime-400/12 border-lime-400/25 text-lime-400"
                  : "bg-white/4 border-white/8 text-neutral-500 hover:bg-white/7 hover:text-neutral-300"
              )}
            >
              {side}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-white/7 bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
          <MuscleHeatmapSvg activeSide={activeSide} regionsById={regionsById} />
        </div>

        <div className="grid gap-2">
          {visibleRegions.map((region) => {
            const style = MUSCLE_STATUS_STYLES[region.status];
            return (
              <div key={region.id} className="rounded-xl border border-white/7 bg-white/3 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-white">{region.label}</p>
                  <span className={cn("px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.16em]", style.chip)}>
                    {region.status}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/6 overflow-hidden mt-2.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(region.intensity * 100, region.volume > 0 ? 10 : 0)}%`,
                      backgroundColor: style.stroke,
                    }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 font-medium mt-2 leading-relaxed">
                  7d load: {Math.round(region.score).toLocaleString()} · {formatLastHitLabel(region.lastHitDays)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {(["fatigued", "recovering", "ready", "undertrained"] as const).map((status) => (
          <div
            key={status}
            className={cn("px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.16em]", MUSCLE_STATUS_STYLES[status].chip)}
          >
            {status}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-4">
        {hasTrackedLoad
          ? "Higher recent load trends hotter. As the week moves on, heavily trained regions cool into recovering and ready states."
          : "Log a few weighted sessions and this map will light up automatically."}
      </p>
    </div>
  );
}
