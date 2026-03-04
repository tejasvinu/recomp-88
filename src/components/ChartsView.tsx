import { useMemo, useState } from "react";
import type { WorkoutProgress, SessionHistory } from "../types";
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
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, BarChart3, Dumbbell, Flame, Award, Info, History, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ChartsViewProps {
  progress: WorkoutProgress;
  sessions: SessionHistory;
  onOpenExercise?: (name: string) => void;
}

const TRAINING_DAYS = WorkoutTemplate.filter((d) => d.id !== "day-7");

export default function ChartsView({ progress, sessions, onOpenExercise }: ChartsViewProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const activeDay = TRAINING_DAYS[selectedDayIdx];

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

  const dayVolumeSummary = useMemo(() => {
    return TRAINING_DAYS.map((day) => {
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

  // ─── PR Tracker: 1RM history per strength exercise ─────────────────────
  const prHistory = useMemo(() => {
    const daySessions = sessions
      .filter((s) => s.dayId === activeDay.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (daySessions.length < 2) return null;

    // Collect all strength exercise names for this day
    const strengthExercises = activeDay.exercises
      .filter((ex) => ex.type === "strength")
      .map((ex) => ex.name);

    if (strengthExercises.length === 0) return null;

    // Build a data series: each entry = one session
    const series = daySessions.map((session) => {
      const point: Record<string, string | number> = {
        date: new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      };
      strengthExercises.forEach((exName) => {
        const ex = session.exercises.find((e) => e.name === exName);
        if (!ex) { point[exName] = 0; return; }
        let best1RM = 0;
        ex.sets.forEach((set) => {
          const w = parseFloat(set.loggedWeight) || 0;
          const r = parseFloat(set.loggedReps) || 0;
          if (w > 0 && r > 0) {
            const e1rm = w * (1 + r / 30);
            if (e1rm > best1RM) best1RM = e1rm;
          }
        });
        point[exName] = Math.round(best1RM * 10) / 10;
      });
      return point;
    });

    return { series, exercises: strengthExercises };
  }, [sessions, activeDay]);

  // ─── Week-over-week comparison ──────────────────────────────────────────
  const weekComparison = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - oneWeekMs;
    const twoWeeksAgo = now - 2 * oneWeekMs;

    const getSessionVolume = (s: SessionHistory[number]) =>
      s.exercises.reduce(
        (eAcc, ex) =>
          eAcc +
          ex.sets.reduce(
            (sAcc, set) =>
              sAcc + (parseFloat(set.loggedWeight) || 0) * (parseFloat(set.loggedReps) || 0),
            0
          ),
        0
      );

    const thisWeekSessions = sessions.filter((s) => new Date(s.date).getTime() >= oneWeekAgo);
    const lastWeekSessions = sessions.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= twoWeeksAgo && t < oneWeekAgo;
    });

    const thisWeekVol = Math.round(thisWeekSessions.reduce((a, s) => a + getSessionVolume(s), 0));
    const lastWeekVol = Math.round(lastWeekSessions.reduce((a, s) => a + getSessionVolume(s), 0));
    const change = lastWeekVol > 0 ? Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100) : null;

    return {
      thisWeek: thisWeekVol,
      lastWeek: lastWeekVol,
      thisWeekCount: thisWeekSessions.length,
      lastWeekCount: lastWeekSessions.length,
      change,
      hasData: sessions.length >= 2,
    };
  }, [sessions]);

  // ─── Recent session history list ────────────────────────────────────────
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sessions]);

  const totalWeeklyVolume = dayVolumeSummary.reduce((acc, d) => acc + d.volume, 0);
  const hasAnyData = exerciseStats.some((e) => e.totalVolume > 0) || totalWeeklyVolume > 0;

  const LINE_COLORS = ["#a3e635", "#38bdf8", "#f97316", "#a78bfa", "#fb923c"];

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
          <BarChart3 size={22} className="text-lime-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">Progression</h2>
          <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-widest">Volume · tonnage · estimated 1RM</p>
        </div>
      </div>

      {/* Weekly Tonnage Chart */}
      <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-lime-400" />
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Weekly Tonnage</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-lime-400 tabular-nums">{totalWeeklyVolume.toLocaleString()}</span>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">kg</span>
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
                  formatter={(value: unknown) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                  labelFormatter={(label: unknown) => {
                    const day = dayVolumeSummary.find((d) => d.name === String(label));
                    return day ? day.fullName : String(label);
                  }}
                  cursor={{ fill: "rgba(163,230,53,0.04)" }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {dayVolumeSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.volume > 0 ? "#a3e635" : "#1f1f1f"} fillOpacity={entry.volume > 0 ? 0.85 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="Log weights & reps to see your weekly tonnage" />
        )}
      </div>

      {/* Week-over-week comparison */}
      {weekComparison.hasData && (
        <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-lime-400" />
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Week vs Week</h3>
            {weekComparison.change !== null && (
              <div className={cn(
                "ml-auto flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-lg border",
                weekComparison.change > 0
                  ? "text-lime-400 bg-lime-400/10 border-lime-400/20"
                  : weekComparison.change < 0
                    ? "text-red-400 bg-red-400/10 border-red-400/20"
                    : "text-neutral-400 bg-white/5 border-white/8"
              )}>
                {weekComparison.change > 0
                  ? <ArrowUp size={11} />
                  : weekComparison.change < 0
                    ? <ArrowDown size={11} />
                    : <Minus size={11} />}
                {Math.abs(weekComparison.change)}%
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-lime-400/8 border border-lime-400/20 rounded-xl p-3.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-lime-400/70 mb-2">This Week</p>
              <p className="text-xl font-mono font-bold text-lime-400 tabular-nums leading-none">
                {weekComparison.thisWeek.toLocaleString()}
                <span className="text-[9px] text-lime-400/60 font-bold uppercase tracking-widest ml-1">kg</span>
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
                  <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest ml-1">kg</span>
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

      {/* Day Selector */}
      <div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
          {TRAINING_DAYS.map((day, idx) => (
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

        {exerciseStats.some((e) => e.totalVolume > 0) ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exerciseStats.filter((e) => e.totalVolume > 0)} barSize={18} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#525252", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={82} tick={{ fill: "#c4c4c4", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12, fontFamily: "DM Mono, monospace" }}
                  labelStyle={{ color: "#fff", fontWeight: 800, fontSize: 11 }}
                  formatter={(value: unknown) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                  cursor={{ fill: "rgba(163,230,53,0.04)" }}
                />
                <Bar dataKey="totalVolume" fill="#a3e635" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message={`No data logged for ${activeDay.name} yet`} />
        )}

        {exerciseStats.some((e) => e.totalVolume > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatCard label="Total Vol" value={`${exerciseStats.reduce((a, e) => a + e.totalVolume, 0).toLocaleString()}`} unit="kg" />
            <StatCard label="Top Weight" value={`${Math.max(...exerciseStats.map((e) => e.maxWeight))}`} unit="kg" />
            <StatCard label="Sets" value={`${exerciseStats.reduce((a, e) => a + e.sets, 0)}`} unit="sets" />
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
              <div key={entry.name} className="flex items-center justify-between bg-white/4 border border-white/7 rounded-xl p-3.5 hover:bg-white/7 transition-colors">
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
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest ml-1">kg</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-neutral-600 mt-3 text-center font-medium">
            1RM = weight × (1 + reps ÷ 30) · most accurate for 1–10 rep sets
          </p>
        </div>
      )}

      {/* ─── PR Tracker (requires ≥2 sessions for active day) ─── */}
      {prHistory && (
        <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-lime-400" />
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest">PR Tracker</h3>
            <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest ml-auto bg-white/4 px-2 py-1 rounded-md border border-white/6">
              {sessions.filter((s) => s.dayId === activeDay.id).length} sessions
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 font-medium mb-4 uppercase tracking-wider">Est. 1RM over time</p>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prHistory.series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                  width={32}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 11, fontFamily: "DM Mono, monospace" }}
                  labelStyle={{ color: "#a3e635", fontWeight: 800, textTransform: "uppercase" as const, fontSize: 9, letterSpacing: "0.1em" }}
                  formatter={(value: unknown, name: unknown) => [`${value} kg`, String(name)]}
                  cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                {prHistory.exercises.map((exName, i) => (
                  <Line
                    key={exName}
                    type="monotone"
                    dataKey={exName}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {prHistory.exercises.map((exName, i) => (
              <div key={exName} className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">{exName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recent Session History ─── */}
      {recentSessions.length > 0 && (
        <div className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-lime-400" />
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Recent Sessions</h3>
          </div>

          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => {
              const totalVol = session.exercises.reduce((acc, ex) =>
                acc + ex.sets.reduce((s, set) => s + (parseFloat(set.loggedWeight) || 0) * (parseFloat(set.loggedReps) || 0), 0)
              , 0);
              return (
                <div key={session.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-xl px-3.5 py-3">
                  <div>
                    <p className="text-[13px] font-bold text-white leading-snug">{session.dayName}</p>
                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5 uppercase tracking-wider">
                      {new Date(session.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-mono font-bold text-lime-400 tabular-nums">{Math.round(totalVol).toLocaleString()} <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">kg</span></p>
                    <p className="text-[10px] text-neutral-600 font-medium mt-0.5">{session.exercises.length} exercises</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && sessions.length === 0 && (
        <div className="bg-white/2 border border-dashed border-white/8 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-white/4 border border-white/8 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-neutral-600" />
          </div>
          <p className="text-[15px] font-black text-white mb-1.5 tracking-wide">No progression data yet</p>
          <p className="text-[12px] text-neutral-500 font-medium leading-relaxed max-w-[260px] mx-auto">
            Log weights and reps in the tracker, then tap "Finish & Reset" to save your first session.
          </p>
        </div>
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
