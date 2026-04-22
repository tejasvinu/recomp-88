'use client';

/**
 * useAnalytics.ts
 *
 * Custom hook that extracts and memoises all the complex calculation logic
 * previously embedded directly in ChartsView.tsx. ChartsView now simply calls
 * this hook and receives ready-to-render data structures.
 */

import { useMemo, useState, useEffect } from 'react';
import type {
    WorkoutTemplate,
    WorkoutProgress,
    SessionHistory,
    BodyWeightEntry,
    ExerciseWiki,
} from '../types';
import { isTrainingDay } from '../data';
import { resolveWeight, getClosestBodyWeight, toLocalDateKey } from '../utils';
import { findWikiEntry } from '../wikiData';

// ─── Constants ────────────────────────────────────────────────────────────────
const EPLEY_REP_CAP = 15;
const RECOVERY_LOOKBACK_DAYS = 7;
const PRIMARY_MUSCLE_WEIGHT = 1;
const SECONDARY_MUSCLE_WEIGHT = 0.55;

// ─── Types ────────────────────────────────────────────────────────────────────
export type MuscleRecoveryStatus = 'fatigued' | 'recovering' | 'ready' | 'undertrained';
export type MuscleRegionId =
    | 'chest'
    | 'frontShoulders'
    | 'biceps'
    | 'abs'
    | 'quads'
    | 'calves'
    | 'rearShoulders'
    | 'triceps'
    | 'upperBack'
    | 'lats'
    | 'lowerBack'
    | 'glutes'
    | 'hamstrings';
export type ActualRmTarget = 8 | 10;

export interface MuscleRegion {
    id: MuscleRegionId;
    label: string;
    matchers: string[];
}

export interface MuscleRecoveryData {
    id: MuscleRegionId;
    label: string;
    volume: number;
    score: number;
    intensity: number;
    status: MuscleRecoveryStatus;
    lastHitDays: number | null;
}

export interface ExerciseStatEntry {
    exerciseId: string;
    fullName: string;
    totalVolume: number;
    maxWeight: number;
    avgReps: number;
    sets: number;
}

export interface EstimatedMaxEntry {
    exerciseId: string;
    name: string;
    estimated1RM: number;
    bestSet: string;
}

export interface TimelinePoint {
    dateKey: string;
    displayDate: string | number;
    [exerciseKey: string]: string | number | null;
}

export interface PRHistoryData {
    series: TimelinePoint[];
    exercises: Array<{ key: string; label: string }>;
}

export interface DayVolumeSummaryEntry {
    name: string;
    fullName: string;
    volume: number;
}

export interface WeekComparisonData {
    thisWeek: number;
    lastWeek: number;
    thisWeekCount: number;
    lastWeekCount: number;
    change: number | null;
    hasData: boolean;
}

export interface SessionTonnagePoint {
    date: string;
    fullDate: string;
    tonnage: number;
    dayName: string;
}

// ─── MUSCLE_REGIONS lookup ────────────────────────────────────────────────────
export const MUSCLE_REGIONS: MuscleRegion[] = [
    { id: 'chest', label: 'Chest', matchers: ['pectoralis', 'pec', 'serratus'] },
    { id: 'frontShoulders', label: 'Front Delts', matchers: ['anterior deltoid', 'lateral deltoid'] },
    { id: 'biceps', label: 'Biceps / Forearms', matchers: ['biceps', 'brachialis', 'brachioradialis'] },
    { id: 'abs', label: 'Core', matchers: ['rectus abdominis', 'oblique', 'core'] },
    { id: 'quads', label: 'Quads', matchers: ['quadriceps', 'vastus', 'rectus femoris', 'adductors'] },
    { id: 'calves', label: 'Calves', matchers: ['calf', 'gastrocnemius', 'soleus'] },
    { id: 'rearShoulders', label: 'Rear Delts', matchers: ['posterior deltoid', 'rear delt', 'infraspinatus', 'teres minor'] },
    { id: 'triceps', label: 'Triceps', matchers: ['triceps', 'anconeus'] },
    { id: 'upperBack', label: 'Upper Back', matchers: ['rhomboid', 'trapezius', 'teres major'] },
    { id: 'lats', label: 'Lats', matchers: ['latissimus'] },
    { id: 'lowerBack', label: 'Lower Back', matchers: ['erector spinae'] },
    { id: 'glutes', label: 'Glutes', matchers: ['glute'] },
    { id: 'hamstrings', label: 'Hamstrings', matchers: ['hamstring', 'biceps femoris', 'semitendinosus', 'semimembranosus'] },
];

// ─── Status style tokens ────────────────────────────────────────────────────
export const MUSCLE_STATUS_STYLES: Record<
    MuscleRecoveryStatus,
    { fill: string; stroke: string; chip: string; copy: string }
> = {
    fatigued: { fill: 'rgba(248, 113, 113, 0.88)', stroke: 'rgba(252, 165, 165, 0.95)', chip: 'text-red-300 bg-red-400/12 border-red-400/25', copy: 'High recent workload' },
    recovering: { fill: 'rgba(251, 191, 36, 0.82)', stroke: 'rgba(252, 211, 77, 0.95)', chip: 'text-amber-300 bg-amber-400/12 border-amber-400/25', copy: 'Still settling from recent work' },
    ready: { fill: 'rgba(163, 230, 53, 0.78)', stroke: 'rgba(190, 242, 100, 0.95)', chip: 'text-lime-300 bg-lime-400/12 border-lime-400/25', copy: 'Recovered and ready' },
    undertrained: { fill: 'rgba(82, 82, 91, 0.55)', stroke: 'rgba(161, 161, 170, 0.65)', chip: 'text-neutral-300 bg-white/6 border-white/10', copy: 'Very little weighted work this week' },
};

// ─── Pure helpers (module-level, tree-shaken) ─────────────────────────────────
export const calculateEstimatedOneRepMax = (weight: number, reps: number) => {
    if (weight <= 0 || reps <= 0) return 0;
    const capped = Math.min(reps, EPLEY_REP_CAP);
    return weight * (1 + capped / 30);
};

const roundMetric = (v: number) => Math.round(v * 10) / 10;

const matchesRepTarget = (reps: number, target: number) => Math.abs(reps - target) < 0.001;

export const formatSessionDateLabel = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const formatSessionTooltipLabel = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const resolveMuscleRegionId = (muscleName: string): MuscleRegionId | null => {
    const lower = muscleName.toLowerCase();
    return MUSCLE_REGIONS.find((r) => r.matchers.some((m) => lower.includes(m)))?.id ?? null;
};

const buildSessionTimeline = (ordered: SessionHistory) => {
    const dayCounts = new Map<string, number>();
    return ordered.map((session) => {
        const dayKey = toLocalDateKey(session.date) || session.date.slice(0, 10);
        const next = (dayCounts.get(dayKey) ?? 0) + 1;
        dayCounts.set(dayKey, next);
        return {
            session,
            dateKey: session.date,
            displayDate:
                next > 1
                    ? `${formatSessionDateLabel(session.date)} · ${next}`
                    : formatSessionDateLabel(session.date),
        };
    });
};

const getBestSetAtRepTarget = (
    sets: SessionHistory[number]['exercises'][number]['sets'],
    fallbackBw: number,
    targetReps: number,
) => {
    let bestWeight = 0;
    let bestSet = '';
    sets.forEach((set) => {
        const reps = parseFloat(set.loggedReps) || 0;
        if (!matchesRepTarget(reps, targetReps)) return;
        const weight = resolveWeight(set.loggedWeight, fallbackBw);
        if (weight <= bestWeight) return;
        bestWeight = weight;
        bestSet = `${set.loggedWeight} × ${reps}`;
    });
    return { bestWeight, bestSet };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UseAnalyticsProps {
    workoutTemplate: WorkoutTemplate;
    progress: WorkoutProgress;
    sessions: SessionHistory;
    bodyWeightEntries: BodyWeightEntry[];
    customExercises?: ExerciseWiki[];
    weightUnit?: 'kg' | 'lbs';
}

export interface UseAnalyticsReturn {
    // Day selector
    trainingDays: WorkoutTemplate;
    selectedDayIdx: number;
    setSelectedDayIdx: (idx: number) => void;
    activeDay: WorkoutTemplate[number] | null;

    // Rep-max target toggle
    actualRmTarget: ActualRmTarget;
    setActualRmTarget: (target: ActualRmTarget) => void;

    // Computed data
    exerciseStats: ExerciseStatEntry[];
    exerciseStatsById: Map<string, string>;
    estimatedMaxes: EstimatedMaxEntry[];
    dayVolumeSummary: DayVolumeSummaryEntry[];
    prHistory: PRHistoryData | null;
    actualRepMaxHistory: PRHistoryData | null;
    weekComparison: WeekComparisonData;
    recentSessions: SessionHistory;
    bwChartData: Array<{ date: string; weight: number }>;
    muscleRecovery: MuscleRecoveryData[];
    sessionTonnageTrend: SessionTonnagePoint[] | null;
    todayBw: BodyWeightEntry | undefined;
    totalWeeklyVolume: number;
    hasAnyData: boolean;
    customExerciseMap: Map<string, ExerciseWiki>;
}

export function useAnalytics({
    workoutTemplate,
    progress,
    sessions,
    bodyWeightEntries,
    customExercises = [],
    weightUnit = 'kg',
}: UseAnalyticsProps): UseAnalyticsReturn {
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [actualRmTarget, setActualRmTarget] = useState<ActualRmTarget>(10);

    const trainingDays = useMemo(
        () => workoutTemplate.filter(isTrainingDay),
        [workoutTemplate],
    );
    const activeDay = trainingDays[selectedDayIdx] ?? trainingDays[0] ?? null;

    useEffect(() => {
        if (selectedDayIdx >= trainingDays.length && trainingDays.length > 0) {
            setSelectedDayIdx(0);
        }
    }, [selectedDayIdx, trainingDays.length]);

    const customExerciseMap = useMemo(
        () => new Map(customExercises.map((e) => [e.name.toLowerCase().trim(), e])),
        [customExercises],
    );

    // ─── Exercise stats ─────────────────────────────────────────────────────
    const exerciseStats = useMemo<ExerciseStatEntry[]>(() => {
        if (!activeDay) return [];
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;

        const daySessions = sessions
            .filter((s) => s.dayId === activeDay.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = daySessions[0];

        if (!latest) {
            const dayProgress = progress[activeDay.id];
            if (!dayProgress) return [];
            return activeDay.exercises
                .filter((ex) => ex.type !== 'other')
                .map((exercise) => {
                    const exProgress = dayProgress[exercise.id];
                    if (!exProgress)
                        return { exerciseId: exercise.id, fullName: exercise.name, totalVolume: 0, maxWeight: 0, avgReps: 0, sets: 0 };

                    let totalVolume = 0, maxWeight = 0, totalReps = 0, setsWithData = 0;
                    const bw = getClosestBodyWeight(new Date().toISOString(), bodyWeightEntries, defaultBw);
                    Object.values(exProgress).forEach((sd) => {
                        const w = resolveWeight(sd.loggedWeight, bw);
                        const r = parseFloat(sd.loggedReps) || 0;
                        if (w > 0 || r > 0) {
                            totalVolume += w * r;
                            maxWeight = Math.max(maxWeight, w);
                            totalReps += r;
                            setsWithData++;
                        }
                    });
                    return {
                        exerciseId: exercise.id,
                        fullName: exercise.name,
                        totalVolume: Math.round(totalVolume),
                        maxWeight,
                        avgReps: setsWithData > 0 ? Math.round(totalReps / setsWithData) : 0,
                        sets: setsWithData,
                    };
                });
        }

        const bw = getClosestBodyWeight(latest.date, bodyWeightEntries, defaultBw);
        return activeDay.exercises
            .filter((ex) => ex.type !== 'other')
            .map((exercise) => {
                const se = latest.exercises.find(
                    (e) => e.exerciseId === exercise.id || e.name === exercise.name,
                );
                if (!se)
                    return { exerciseId: exercise.id, fullName: exercise.name, totalVolume: 0, maxWeight: 0, avgReps: 0, sets: 0 };

                let totalVolume = 0, maxWeight = 0, totalReps = 0, setsWithData = 0;
                se.sets.forEach((set) => {
                    const w = resolveWeight(set.loggedWeight, bw);
                    const r = parseFloat(set.loggedReps) || 0;
                    if (w > 0 || r > 0) {
                        totalVolume += w * r;
                        maxWeight = Math.max(maxWeight, w);
                        totalReps += r;
                        setsWithData++;
                    } else if (se.type === 'other' && set.completed) {
                        setsWithData++;
                    }
                });
                return {
                    exerciseId: exercise.id,
                    fullName: exercise.name,
                    totalVolume: Math.round(totalVolume),
                    maxWeight,
                    avgReps: setsWithData > 0 ? Math.round(totalReps / setsWithData) : 0,
                    sets: setsWithData,
                };
            });
    }, [sessions, progress, activeDay, weightUnit, bodyWeightEntries]);

    const exerciseStatsById = useMemo(
        () => new Map(exerciseStats.map((e) => [e.exerciseId, e.fullName])),
        [exerciseStats],
    );

    // ─── Estimated 1RM ──────────────────────────────────────────────────────
    const estimatedMaxes = useMemo<EstimatedMaxEntry[]>(() => {
        if (!activeDay) return [];
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;
        const daySessions = sessions
            .filter((s) => s.dayId === activeDay.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (!daySessions[0]) return [];

        const latest = daySessions[0];
        const bw = getClosestBodyWeight(latest.date, bodyWeightEntries, defaultBw);

        return activeDay.exercises
            .filter((ex) => ex.type === 'strength')
            .map((exercise) => {
                const se = latest.exercises.find(
                    (e) => e.exerciseId === exercise.id || e.name === exercise.name,
                );
                if (!se) return { exerciseId: exercise.id, name: exercise.name, estimated1RM: 0, bestSet: '' };

                let best1RM = 0, bestSet = '';
                se.sets.forEach((set) => {
                    const w = resolveWeight(set.loggedWeight, bw);
                    const r = parseFloat(set.loggedReps) || 0;
                    if (w > 0 && r > 0) {
                        const e1rm = calculateEstimatedOneRepMax(w, r);
                        if (e1rm > best1RM) { best1RM = e1rm; bestSet = `${set.loggedWeight} × ${r}`; }
                    }
                });
                return { exerciseId: exercise.id, name: exercise.name, estimated1RM: roundMetric(best1RM), bestSet };
            })
            .filter((e) => e.estimated1RM > 0);
    }, [sessions, activeDay, weightUnit, bodyWeightEntries]);

    // ─── Day volume summary ──────────────────────────────────────────────────
    const dayVolumeSummary = useMemo<DayVolumeSummaryEntry[]>(() => {
        return trainingDays.map((day) => {
            const daySessions = sessions
                .filter((s) => s.dayId === day.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            let vol = 0;
            if (daySessions[0]) {
                const defaultBw = weightUnit === 'lbs' ? 175 : 80;
                const bw = getClosestBodyWeight(daySessions[0].date, bodyWeightEntries, defaultBw);
                daySessions[0].exercises.forEach((ex) => {
                    ex.sets.forEach((set) => {
                        vol += resolveWeight(set.loggedWeight, bw) * (parseFloat(set.loggedReps) || 0);
                    });
                });
            }
            return { name: `D${day.dayNumber}`, fullName: day.name, volume: Math.round(vol) };
        });
    }, [sessions, trainingDays, weightUnit, bodyWeightEntries]);

    // ─── PR history ──────────────────────────────────────────────────────────
    const prHistory = useMemo<PRHistoryData | null>(() => {
        if (!activeDay) return null;
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;
        const daySessions = sessions
            .filter((s) => s.dayId === activeDay.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (daySessions.length < 2) return null;

        const strengthExercises = activeDay.exercises
            .filter((ex) => ex.type === 'strength')
            .map((e) => ({ key: e.id, label: e.name }));
        if (!strengthExercises.length) return null;

        const timeline = buildSessionTimeline(daySessions);
        const series: TimelinePoint[] = timeline.map(({ session, dateKey, displayDate }) => {
            const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
            const point: TimelinePoint = { dateKey, displayDate };
            strengthExercises.forEach((exercise) => {
                const ex = session.exercises.find(
                    (e) => e.exerciseId === exercise.key || e.name === exercise.label,
                );
                if (!ex) { point[exercise.key] = null; return; }
                let best1RM = 0;
                ex.sets.forEach((set) => {
                    const w = resolveWeight(set.loggedWeight, bw);
                    const r = parseFloat(set.loggedReps) || 0;
                    if (w > 0 && r > 0) {
                        const e1rm = calculateEstimatedOneRepMax(w, r);
                        if (e1rm > best1RM) best1RM = e1rm;
                    }
                });
                point[exercise.key] = best1RM > 0 ? roundMetric(best1RM) : null;
            });
            return point;
        });

        const populated = strengthExercises.filter((e) =>
            series.some((p) => typeof p[e.key] === 'number'),
        );
        return populated.length > 0 ? { series, exercises: populated } : null;
    }, [sessions, activeDay, weightUnit, bodyWeightEntries]);

    // ─── Actual Rep Max history ──────────────────────────────────────────────
    const actualRepMaxHistory = useMemo<PRHistoryData | null>(() => {
        if (!activeDay) return null;
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;
        const daySessions = sessions
            .filter((s) => s.dayId === activeDay.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (daySessions.length < 2) return null;

        const tracked = activeDay.exercises
            .filter((ex) => ex.type !== 'other')
            .map((e) => ({ key: e.id, label: e.name }));
        if (!tracked.length) return null;

        const timeline = buildSessionTimeline(daySessions);
        const series: TimelinePoint[] = timeline.map(({ session, dateKey, displayDate }) => {
            const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
            const point: TimelinePoint = { dateKey, displayDate };
            tracked.forEach((exercise) => {
                const se = session.exercises.find(
                    (e) => e.exerciseId === exercise.key || e.name === exercise.label,
                );
                if (!se) { point[exercise.key] = null; return; }
                const { bestWeight } = getBestSetAtRepTarget(se.sets, bw, actualRmTarget);
                point[exercise.key] = bestWeight > 0 ? roundMetric(bestWeight) : null;
            });
            return point;
        });

        const populated = tracked.filter((e) => series.some((p) => typeof p[e.key] === 'number'));
        return populated.length > 0 ? { series, exercises: populated } : null;
    }, [sessions, activeDay, weightUnit, bodyWeightEntries, actualRmTarget]);

    // ─── Week comparison ────────────────────────────────────────────────────
    const weekComparison = useMemo<WeekComparisonData>(() => {
        const oneDayMs = 86_400_000, oneWeekMs = 7 * oneDayMs;
        const normalise = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
        const getWeekStart = (d: Date) => {
            const c = normalise(d);
            c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
            return c;
        };
        const today = new Date();
        const thisStart = getWeekStart(today).getTime();
        const nextStart = thisStart + oneWeekMs;
        const lastStart = thisStart - oneWeekMs;
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;
        const vol = (s: SessionHistory[number]) => {
            const bw = getClosestBodyWeight(s.date, bodyWeightEntries, defaultBw);
            return s.exercises.reduce(
                (ea, ex) =>
                    ea +
                    ex.sets.reduce((sa, set) => {
                        if ((set as { setType?: string }).setType === 'warmup') return sa;
                        return sa + resolveWeight(set.loggedWeight, bw) * (parseFloat(set.loggedReps) || 0);
                    }, 0),
                0,
            );
        };
        const thisWeek = sessions.filter((s) => { const t = new Date(s.date).getTime(); return t >= thisStart && t < nextStart; });
        const lastWeek = sessions.filter((s) => { const t = new Date(s.date).getTime(); return t >= lastStart && t < thisStart; });
        const thisVol = Math.round(thisWeek.reduce((a, s) => a + vol(s), 0));
        const lastVol = Math.round(lastWeek.reduce((a, s) => a + vol(s), 0));
        return {
            thisWeek: thisVol,
            lastWeek: lastVol,
            thisWeekCount: thisWeek.length,
            lastWeekCount: lastWeek.length,
            change: lastVol > 0 ? Math.round(((thisVol - lastVol) / lastVol) * 100) : null,
            hasData: sessions.length >= 2,
        };
    }, [sessions, weightUnit, bodyWeightEntries]);

    // ─── Recent sessions ─────────────────────────────────────────────────────
    const recentSessions = useMemo(
        () =>
            [...sessions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10),
        [sessions],
    );

    // ─── BW chart data ───────────────────────────────────────────────────────
    const bwChartData = useMemo(
        () =>
            bodyWeightEntries.slice(-14).map((e) => ({
                date: e.date.slice(5).replace('-', '/'),
                weight: e.weight,
            })),
        [bodyWeightEntries],
    );

    // ─── Muscle recovery heatmap ─────────────────────────────────────────────
    const muscleRecovery = useMemo<MuscleRecoveryData[]>(() => {
        const windowMs = RECOVERY_LOOKBACK_DAYS * 86_400_000;
        const now = Date.now();
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;

        type Metrics = { id: MuscleRegionId; label: string; volume: number; score: number; lastHitDays: number | null };
        const regionMetrics = Object.fromEntries(
            MUSCLE_REGIONS.map((r) => [r.id, { id: r.id, label: r.label, volume: 0, score: 0, lastHitDays: null as number | null }]),
        ) as Record<MuscleRegionId, Metrics>;

        sessions.forEach((session) => {
            const t = new Date(session.date).getTime();
            if (!Number.isFinite(t) || now - t > windowMs) return;
            const ageDays = Math.max(0, (now - t) / 86_400_000);
            const recency = Math.max(0.2, 1 - ageDays / RECOVERY_LOOKBACK_DAYS);
            const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);

            session.exercises.forEach((exercise) => {
                if (exercise.type === 'other') return;
                const wiki = findWikiEntry(exercise.name) ?? customExerciseMap.get(exercise.name.toLowerCase().trim());
                if (!wiki) return;

                const exVol = exercise.sets.reduce((acc, set) => {
                    return acc + resolveWeight(set.loggedWeight, bw) * (parseFloat(set.loggedReps) || 0);
                }, 0);
                if (exVol <= 0) return;

                const applyStim = (muscles: string[], mult: number) => {
                    muscles.forEach((m) => {
                        const rid = resolveMuscleRegionId(m);
                        if (!rid) return;
                        regionMetrics[rid].volume += exVol * mult;
                        regionMetrics[rid].score += exVol * mult * recency;
                        regionMetrics[rid].lastHitDays =
                            regionMetrics[rid].lastHitDays === null
                                ? ageDays
                                : Math.min(regionMetrics[rid].lastHitDays!, ageDays);
                    });
                };
                applyStim(wiki.muscles.primary, PRIMARY_MUSCLE_WEIGHT);
                applyStim(wiki.muscles.secondary, SECONDARY_MUSCLE_WEIGHT);
            });
        });

        const maxScore = Math.max(...Object.values(regionMetrics).map((r) => r.score), 0);

        return MUSCLE_REGIONS.map((region) => {
            const m = regionMetrics[region.id];
            const intensity = maxScore > 0 ? m.score / maxScore : 0;
            let status: MuscleRecoveryStatus = 'undertrained';
            if (m.volume <= 0 || intensity < 0.14) status = 'undertrained';
            else if (m.lastHitDays !== null && m.lastHitDays <= 2 && intensity >= 0.55) status = 'fatigued';
            else if (m.lastHitDays !== null && m.lastHitDays <= 4 && intensity >= 0.28) status = 'recovering';
            else status = 'ready';
            return { ...m, intensity, status };
        }).sort((a, b) => b.score - a.score);
    }, [sessions, bodyWeightEntries, customExerciseMap, weightUnit]);

    // ─── Session tonnage trend ────────────────────────────────────────────────
    const sessionTonnageTrend = useMemo<SessionTonnagePoint[] | null>(() => {
        if (sessions.length < 2) return null;
        const defaultBw = weightUnit === 'lbs' ? 175 : 80;
        const data = [...sessions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-20)
            .map((session) => {
                const bw = getClosestBodyWeight(session.date, bodyWeightEntries, defaultBw);
                const tonnage = session.exercises.reduce(
                    (total, ex) =>
                        total +
                        ex.sets.reduce((st, set) => {
                            if ((set as { setType?: string }).setType === 'warmup') return st;
                            return st + resolveWeight(set.loggedWeight, bw) * (parseFloat(set.loggedReps) || 0);
                        }, 0),
                    0,
                );
                return {
                    date: formatSessionDateLabel(session.date),
                    fullDate: session.date,
                    tonnage: Math.round(tonnage),
                    dayName: session.dayName,
                };
            })
            .filter((d) => d.tonnage > 0);
        return data.length >= 2 ? data : null;
    }, [sessions, bodyWeightEntries, weightUnit]);

    // ─── Derived ───────────────────────────────────────────────────────────────
    const todayBw = bodyWeightEntries.find((e) => e.date === toLocalDateKey());
    const totalWeeklyVolume = dayVolumeSummary.reduce((acc, d) => acc + d.volume, 0);
    const hasAnyData = exerciseStats.some((e) => e.totalVolume > 0) || totalWeeklyVolume > 0;

    return {
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
        customExerciseMap,
    };
}
