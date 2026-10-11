'use client';

import { useMemo } from "react";
import type { SessionHistory, WeightUnit, WorkoutTemplate } from "../types";
import { useModalEscape } from "../hooks/useModalEscape";
import { formatSessionDateLabel } from "../hooks/useAnalytics";
import {
  extractExerciseSessionHistory,
  detectRepPRs,
  computeProgressionHint,
  findPlannedRepRange,
  type RepRange,
} from "../lib/exerciseHistory";
import { convertMass, roundMetric } from "../lib/trainingMath";
import {
  X,
  TrendingUp,
  Trophy,
  History,
  Zap,
  Dumbbell,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ExerciseHistoryModalProps {
  exerciseId?: string;
  exerciseName: string;
  sessions: SessionHistory;
  workoutTemplate?: WorkoutTemplate;
  weightUnit?: WeightUnit;
  onClose: () => void;
}

export default function ExerciseHistoryModal({
  exerciseId,
  exerciseName,
  sessions,
  workoutTemplate = [],
  weightUnit = "kg",
  onClose,
}: ExerciseHistoryModalProps) {
  useModalEscape(onClose);

  // Match planned rep range from workout template
  const plannedRepRange: RepRange | null = useMemo(() => {
    for (const day of workoutTemplate) {
      for (const ex of day.exercises) {
        if (
          (exerciseId && ex.id === exerciseId) ||
          ex.name.toLowerCase() === exerciseName.toLowerCase()
        ) {
          const range = findPlannedRepRange(ex);
          if (range) return range;
        }
      }
    }
    return null;
  }, [workoutTemplate, exerciseId, exerciseName]);

  // Find effective exercise ID or match by name
  const effectiveExerciseId = useMemo(() => {
    if (exerciseId) return exerciseId;
    for (const s of sessions) {
      const match = s.exercises.find(
        (ex) => ex.name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (match) return match.exerciseId;
    }
    return exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }, [exerciseId, exerciseName, sessions]);

  // Extract session history
  const history = useMemo(() => {
    // Normalise sessions so exercises matching by name also match effective ID
    const normalisedSessions = sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.name.toLowerCase() === exerciseName.toLowerCase()
          ? { ...ex, exerciseId: effectiveExerciseId }
          : ex
      ),
    }));
    return extractExerciseSessionHistory(normalisedSessions, effectiveExerciseId);
  }, [sessions, exerciseName, effectiveExerciseId]);

  // Detect rep PRs per weight
  const { allTimeBest: repPRs } = useMemo(() => {
    const normalisedSessions = sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.name.toLowerCase() === exerciseName.toLowerCase()
          ? { ...ex, exerciseId: effectiveExerciseId }
          : ex
      ),
    }));
    return detectRepPRs(normalisedSessions, effectiveExerciseId);
  }, [sessions, exerciseName, effectiveExerciseId]);

  // Compute progression hint
  const progressionHint = useMemo(() => {
    return computeProgressionHint({
      history,
      plannedRepRange,
      minSessions: 3,
    });
  }, [history, plannedRepRange]);

  // Format chart series
  const chartData = useMemo(() => {
    return history
      .filter((s) => s.topSet && s.topSet.loadKg !== null)
      .map((s) => {
        const topSetKg = s.topSet!.loadKg!;
        const topSetDisplay =
          weightUnit === "lbs"
            ? roundMetric(convertMass(topSetKg, "kg", "lbs"))
            : topSetKg;
        const e1rmDisplay =
          s.estimated1RmKg !== null
            ? weightUnit === "lbs"
              ? roundMetric(convertMass(s.estimated1RmKg, "kg", "lbs"))
              : s.estimated1RmKg
            : null;

        return {
          date: s.date ? formatSessionDateLabel(s.date) : "Session",
          rawDate: s.date ?? "",
          topSet: topSetDisplay,
          topSetReps: s.topSet!.reps,
          e1rm: e1rmDisplay,
        };
      });
  }, [history, weightUnit]);

  // Last 5 sessions (most recent first)
  const last5Sessions = useMemo(() => {
    return history.slice(-5).reverse();
  }, [history]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-history-title"
    >
      <div className="w-full max-w-lg bg-canvas border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/6 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent-400/10 border border-accent-400/20 flex items-center justify-center text-accent-400 shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="exercise-history-title"
                className="text-base sm:text-lg font-bold text-white truncate"
              >
                {exerciseName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {plannedRepRange && (
                  <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                    Target: {plannedRepRange.min}–{plannedRepRange.max} reps
                  </span>
                )}
                <span className="text-micro text-neutral-500 font-mono">
                  {history.length} {history.length === 1 ? "session" : "sessions"} logged
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/8 bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto overscroll-contain">
          {/* Progression Hint */}
          {progressionHint && (
            <div className="rounded-2xl p-3.5 bg-accent-400/10 border border-accent-400/25 flex items-start gap-3 shadow-[0_0_20px_rgba(204,255,0,0.06)]">
              <div className="w-7 h-7 rounded-lg bg-accent-400/20 flex items-center justify-center text-accent-400 shrink-0 mt-0.5">
                <Zap size={15} className="fill-accent-400" />
              </div>
              <div className="min-w-0">
                <p className="text-micro font-black uppercase tracking-widest text-accent-400">
                  Progression recommendation
                </p>
                <p className="text-caption sm:text-body font-semibold text-white mt-0.5">
                  {progressionHint}
                </p>
                <p className="text-micro text-neutral-400 mt-1">
                  Based on hitting the top of your planned rep range across consecutive workouts.
                </p>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="rounded-2xl border border-white/6 bg-neutral-900/50 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell size={15} className="text-accent-400" />
                <h3 className="text-small font-black uppercase tracking-widest text-white">
                  Progression Over Time
                </h3>
              </div>
              <div className="flex items-center gap-3 text-micro font-bold">
                <span className="flex items-center gap-1 text-accent-400">
                  <span className="w-2 h-2 rounded-full bg-accent-400" />
                  Top Set
                </span>
                <span className="flex items-center gap-1 text-info-400">
                  <span className="w-2 h-2 rounded-full bg-info-400" />
                  Est. 1RM (estimate)
                </span>
              </div>
            </div>

            {chartData.length >= 2 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-chart-grid)"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="var(--color-neutral-600)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--color-neutral-600)"
                      fontSize={10}
                      tickLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-neutral-900 border border-white/10 rounded-xl p-2.5 shadow-xl text-micro font-mono">
                            <p className="text-neutral-400 font-bold mb-1">{label}</p>
                            <p className="text-accent-400 font-semibold">
                              Top Set: {data.topSet} {weightUnit} × {data.topSetReps} reps
                            </p>
                            {data.e1rm !== null && (
                              <p className="text-info-400 mt-0.5">
                                Est. 1RM: {data.e1rm} {weightUnit}{" "}
                                <span className="text-neutral-500">(estimate)</span>
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="topSet"
                      stroke="var(--color-accent-400)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-accent-400)" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke="var(--color-info-400)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: "var(--color-info-400)" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : chartData.length === 1 ? (
              <div className="py-6 text-center text-caption text-neutral-500">
                1 session recorded ({chartData[0].topSet} {weightUnit} × {chartData[0].topSetReps} reps). Log one more session to render trend chart.
              </div>
            ) : (
              <div className="py-8 text-center text-caption text-neutral-500">
                No measurable working sets recorded for this exercise yet.
              </div>
            )}
          </div>

          {/* Personal Records per Weight */}
          <div className="rounded-2xl border border-white/6 bg-neutral-900/50 p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={15} className="text-warn-400" />
              <h3 className="text-small font-black uppercase tracking-widest text-white">
                Rep PRs per Weight
              </h3>
            </div>

            {repPRs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {repPRs.map((pr) => {
                  const displayWeight =
                    weightUnit === "lbs"
                      ? roundMetric(convertMass(pr.loadKg, "kg", "lbs"))
                      : pr.loadKg;
                  return (
                    <div
                      key={pr.loadKg}
                      className="p-2.5 rounded-xl border border-white/6 bg-white/[0.02] flex flex-col justify-between"
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-body font-mono font-bold text-white">
                          {displayWeight}
                          <span className="text-micro text-neutral-500 ml-0.5">
                            {weightUnit}
                          </span>
                        </span>
                        <span className="text-caption font-mono font-bold text-accent-400">
                          {pr.reps} reps
                        </span>
                      </div>
                      {pr.achievedAt && (
                        <span className="text-micro text-neutral-500 mt-1 truncate">
                          {formatSessionDateLabel(pr.achievedAt)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-caption text-neutral-500 py-3 text-center">
                No working set PRs recorded yet.
              </p>
            )}
          </div>

          {/* Last 5 Sessions */}
          <div className="rounded-2xl border border-white/6 bg-neutral-900/50 p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <History size={15} className="text-info-400" />
              <h3 className="text-small font-black uppercase tracking-widest text-white">
                Last 5 Sessions
              </h3>
            </div>

            {last5Sessions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {last5Sessions.map((session) => {
                  const topSet = session.topSet;
                  const displayLoad =
                    topSet && topSet.loadKg !== null
                      ? weightUnit === "lbs"
                        ? roundMetric(convertMass(topSet.loadKg, "kg", "lbs"))
                        : topSet.loadKg
                      : null;
                  const displayVol =
                    session.totalWorkingVolumeKgReps !== null
                      ? weightUnit === "lbs"
                        ? Math.round(
                            convertMass(session.totalWorkingVolumeKgReps, "kg", "lbs")
                          )
                        : Math.round(session.totalWorkingVolumeKgReps)
                      : null;
                  const displayE1rm =
                    session.estimated1RmKg !== null
                      ? weightUnit === "lbs"
                        ? roundMetric(convertMass(session.estimated1RmKg, "kg", "lbs"))
                        : session.estimated1RmKg
                      : null;

                  return (
                    <div
                      key={session.sessionId}
                      className="p-3 rounded-xl border border-white/6 bg-white/[0.02] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-caption font-bold text-neutral-200">
                          <Calendar size={12} className="text-neutral-500" />
                          <span>{session.date ?? "Unknown date"}</span>
                          <span className="text-neutral-600 font-normal">·</span>
                          <span className="text-neutral-400 font-normal text-micro">
                            {session.dayName}
                          </span>
                        </div>
                        <span className="text-micro font-mono text-neutral-500">
                          {session.completedWorkingSets} working{" "}
                          {session.completedWorkingSets === 1 ? "set" : "sets"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-caption font-mono pt-1 border-t border-white/5">
                        <span className="text-neutral-400">
                          Top:{" "}
                          {displayLoad !== null ? (
                            <strong className="text-accent-400">
                              {displayLoad} {weightUnit} × {topSet?.reps}
                            </strong>
                          ) : (
                            <span className="text-neutral-600">Unmeasured</span>
                          )}
                        </span>
                        <span className="text-neutral-400">
                          Vol:{" "}
                          {displayVol !== null ? (
                            <strong className="text-neutral-200">
                              {displayVol.toLocaleString()} {weightUnit}_reps
                            </strong>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </span>
                      </div>

                      {displayE1rm !== null && (
                        <div className="text-micro text-neutral-500 font-mono flex items-center justify-between">
                          <span>Est. 1RM:</span>
                          <span className="text-info-400 font-bold">
                            ~{displayE1rm} {weightUnit}{" "}
                            <span className="text-neutral-600 font-normal">
                              (estimate, Epley)
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-caption text-neutral-500 py-3 text-center">
                No past sessions recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
