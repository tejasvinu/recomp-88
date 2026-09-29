'use client';

import { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
    Flame,
    TrendingUp,
    HeartPulse,
    Activity,
    Play,
    ArrowRight,
    Sparkles,
    Calendar
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useAnalytics } from "../hooks/useAnalytics";
import { toLocalDateKey } from "../utils";
import { getExerciseSetsWithExtras } from "../data";
import { StretchPrograms } from "../stretchingData";

// Animation Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 22 } }
};

interface DashboardTabProps {
    onStartStretching?: (programId: string) => void;
    onOpenJustShowUp?: () => void;
}

export default function DashboardTab({ onStartStretching, onOpenJustShowUp }: DashboardTabProps) {
    const progress = useAppStore((s) => s.progress);
    const sessions = useAppStore((s) => s.sessions);
    const bodyWeightEntries = useAppStore((s) => s.bodyWeightEntries);
    const customExercises = useAppStore((s) => s.customExercises);
    const weightUnit = useAppStore((s) => s.weightUnit);
    const workoutTemplate = useAppStore((s) => s.workoutTemplate);
    const activeDayIndex = useAppStore((s) => s.activeDayIndex);
    const setActiveTab = useAppStore((s) => s.setActiveTab);

    // Call global analytics calculations
    const analytics = useAnalytics({
        workoutTemplate,
        progress,
        sessions,
        bodyWeightEntries,
        customExercises,
        weightUnit,
    });

    const sessionDates = useMemo(() => {
        return new Set(sessions.map((s) => toLocalDateKey(s.date)));
    }, [sessions]);

    // Consistency Grid Data (Last 12 Weeks)
    const { gridData, activeStreak } = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
        const gridStart = new Date(startOfThisWeek.getTime() - 11 * 7 * 24 * 60 * 60 * 1000);

        const grid: Array<Array<{ dateStr: string; completed: boolean }>> = [];
        for (let w = 0; w < 12; w++) {
            const week: Array<{ dateStr: string; completed: boolean }> = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(gridStart.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
                const dateStr = toLocalDateKey(date);
                const completed = sessionDates.has(dateStr);
                week.push({ dateStr, completed });
            }
            grid.push(week);
        }

        // Streak calculation
        let streak = 0;
        const checkDate = new Date();
        const todayStr = toLocalDateKey(checkDate);
        const yesterday = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = toLocalDateKey(yesterday);

        if (sessionDates.has(todayStr) || sessionDates.has(yesterdayStr)) {
            const cursor = sessionDates.has(todayStr) ? checkDate : yesterday;
            while (true) {
                const cursorStr = toLocalDateKey(cursor);
                if (sessionDates.has(cursorStr)) {
                    streak++;
                    cursor.setDate(cursor.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        return { gridData: grid, activeStreak: streak };
    }, [sessionDates]);

    // Overall Muscle Readiness Score (Averaging scores from muscleRecovery status)
    const readinessScore = useMemo(() => {
        if (!analytics.muscleRecovery.length) return 100;
        const statusScores = {
            ready: 100,
            undertrained: 100,
            recovering: 70,
            fatigued: 35
        };
        const total = analytics.muscleRecovery.reduce(
            (acc, m) => acc + statusScores[m.status],
            0
        );
        return Math.round(total / analytics.muscleRecovery.length);
    }, [analytics.muscleRecovery]);

    // Active day template details and workout progress
    const activeDay = workoutTemplate[Math.min(activeDayIndex, workoutTemplate.length - 1)] ?? null;
    const workoutProgressState = useMemo(() => {
        if (!activeDay) return { started: false, completed: false, percent: 0 };
        const dayProgress = progress[activeDay.id] || {};
        let totalSets = 0;
        let completedSets = 0;

        activeDay.exercises.forEach((ex) => {
            const sets = getExerciseSetsWithExtras(ex, dayProgress[ex.id]);
            totalSets += sets.length;
            sets.forEach((set) => {
                if (dayProgress[ex.id]?.[set.id]?.completed) completedSets++;
            });
        });

        if (totalSets === 0) return { started: false, completed: false, percent: 0 };
        return {
            started: completedSets > 0,
            completed: completedSets === totalSets,
            percent: Math.round((completedSets / totalSets) * 100)
        };
    }, [activeDay, progress]);

    // Suggest stretching routines based on trained / fatigued muscles
    const suggestedRecoveryProgram = useMemo(() => {
        const topFatigued = analytics.muscleRecovery
            .filter((m) => m.status === "fatigued")
            .map((m) => m.label.toLowerCase());

        if (topFatigued.length === 0) {
            // fallback to activeDay stretching program or first available stretching program
            const matched = StretchPrograms.find(
                (p) => p.id === activeDay?.postWorkoutStretchId || p.id === activeDay?.stretchingProgramId
            );
            return matched ?? StretchPrograms[0];
        }

        // Search StretchPrograms focusing on one of the fatigued muscles
        const matched = StretchPrograms.find((program) =>
            program.focusAreas?.some((area) =>
                topFatigued.some((f) => area.toLowerCase().includes(f) || f.includes(area.toLowerCase()))
            )
        );

        return matched ?? StretchPrograms[0];
    }, [analytics.muscleRecovery, activeDay]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4 pb-8"
        >
            {/* 1. Header */}
            <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 bg-accent-400/10 border border-accent-400/20 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={22} className="text-accent-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-wide">Welcome back</h2>
                    <p className="text-caption text-neutral-500 font-medium uppercase tracking-widest">
                        Recomposition dashboard & stats
                    </p>
                </div>
            </div>

            {/* 2. Consistency Calendar Grid */}
            <motion.div
                variants={cardVariants}
                className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-accent-400" />
                        <h3 className="text-small font-black text-white uppercase tracking-widest">
                            Consistency
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 bg-accent-400/8 border border-accent-400/20 px-2.5 py-1 rounded-xl text-accent-400 font-mono font-bold text-caption">
                        <Flame size={12} className="fill-current animate-pulse" />
                        {activeStreak} Day Streak
                    </div>
                </div>

                <div className="flex justify-between gap-1 overflow-x-auto scrollbar-none py-1">
                    {gridData.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                            {week.map((day, dIdx) => (
                                <div
                                    key={`${wIdx}-${dIdx}`}
                                    className={`w-[11px] h-[11px] rounded-[3px] transition-colors duration-300 ${
                                        day.completed
                                            ? "bg-accent-400 shadow-[0_0_8px_color-mix(in_oklab,_var(--color-accent-400)_40%,_transparent)]"
                                            : "bg-white/4 border border-white/5"
                                    }`}
                                    title={day.dateStr}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between text-micro text-neutral-500 font-bold uppercase tracking-widest mt-3 px-1">
                    <span>12 Weeks Ago</span>
                    <span>This Week</span>
                </div>
            </motion.div>

            {/* 2.5 Just Show Up CTA — a low-barrier way back when the routine feels heavy */}
            <motion.button
                variants={cardVariants}
                onClick={onOpenJustShowUp}
                className="group text-left bg-neutral-900/50 border border-accent-400/20 rounded-2xl p-4 shadow-lg relative overflow-hidden active:scale-[0.99] transition-transform cursor-pointer"
            >
                <div className="absolute top-0 right-0 w-28 h-28 bg-accent-400/10 rounded-full blur-[36px] pointer-events-none" />
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-accent-400/12 border border-accent-400/25 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Play size={20} className="text-accent-400 fill-accent-400/25" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-body font-black text-white tracking-wide leading-snug">
                            Just Show Up
                        </p>
                        <p className="text-mini text-neutral-500 mt-0.5 leading-relaxed">
                            A 15-minute, no-pressure session. It still counts toward your streak.
                        </p>
                    </div>
                    <ArrowRight size={16} className="text-accent-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
            </motion.button>

            {/* 3. Next Up Card */}
            {activeDay && (
                <motion.div
                    variants={cardVariants}
                    className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg relative overflow-hidden"
                >
                    {/* Background visual highlight */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-400/5 rounded-full blur-[40px] pointer-events-none" />

                    <p className="text-mini text-accent-400 font-black uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                        <Activity size={10} />
                        Next Up
                    </p>

                    {workoutProgressState.completed ? (
                        <div>
                            <h4 className="text-lg font-black text-white leading-tight">
                                Today&apos;s Workout Complete!
                            </h4>
                            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed max-w-xs">
                                Awesome job finishing {activeDay.name}! Make sure to focus on stretching and dynamic cooldown recovery.
                            </p>
                            {suggestedRecoveryProgram && (
                                <button
                                    onClick={() => onStartStretching?.(suggestedRecoveryProgram.id)}
                                    className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-accent-400 text-neutral-950 font-black text-caption uppercase tracking-widest rounded-xl hover:bg-accent-300 active:scale-95 transition-all shadow-[0_0_15px_color-mix(in_oklab,_var(--color-accent-400)_20%,_transparent)]"
                                >
                                    Start {suggestedRecoveryProgram.name}
                                    <ArrowRight size={13} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <h4 className="text-lg font-black text-white leading-tight">
                                    Day {activeDay.dayNumber}: {activeDay.name}
                                </h4>
                                {workoutProgressState.started && (
                                    <span className="text-mini font-mono text-accent-400 font-bold bg-accent-400/10 border border-accent-400/20 px-2 py-0.5 rounded-lg">
                                        {workoutProgressState.percent}% In Progress
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mb-4">
                                {activeDay.title} · {activeDay.exercises.length} exercises planned. 
                                {activeDay.primerId ? " Pre-workout warmups available." : ""}
                            </p>

                            {/* Progress bar when in progress */}
                            {workoutProgressState.started && (
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4 border border-white/6">
                                    <div
                                        className="h-full bg-accent-400 transition-all duration-500 rounded-full"
                                        style={{ width: `${workoutProgressState.percent}%` }}
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => setActiveTab("workout")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-accent-400 text-neutral-950 font-black text-caption uppercase tracking-widest rounded-xl hover:bg-accent-300 active:scale-95 transition-all shadow-[0_0_15px_color-mix(in_oklab,_var(--color-accent-400)_20%,_transparent)]"
                            >
                                <Play size={12} fill="currentColor" />
                                {workoutProgressState.started ? "Resume Workout" : "Start Workout"}
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* 4. Readiness & Weekly Stats side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Muscle Readiness Circular Indicator */}
                <motion.div
                    variants={cardVariants}
                    className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                >
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                        <HeartPulse size={15} className="text-accent-400" />
                        <h3 className="text-small font-black text-white uppercase tracking-widest">
                            Readiness
                        </h3>
                    </div>

                    <div className="flex items-center justify-center gap-5 my-2">
                        {/* Circle readiness svg */}
                        <div className="relative w-24 h-24 shrink-0">
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="40%"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-white/5"
                                />
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="40%"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeDasharray={251}
                                    strokeDashoffset={251 * (1 - readinessScore / 100)}
                                    className="text-accent-400 transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-mono font-bold text-white leading-none mt-1">
                                    {readinessScore}
                                </span>
                                <span className="text-micro text-accent-400/70 font-black uppercase mt-0.5">%</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-body font-bold text-white tracking-wide leading-snug">
                                {readinessScore >= 85
                                    ? "Fully Recovered"
                                    : readinessScore >= 60
                                    ? "Good to Lift"
                                    : "Take it Easy"}
                            </p>
                            <p className="text-mini text-neutral-500 mt-1 leading-normal">
                                Based on relative recovery states across 13 target muscle groups.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Weekly Stats summary */}
                <motion.div
                    variants={cardVariants}
                    className="bg-neutral-900/50 border border-white/6 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                >
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                        <TrendingUp size={15} className="text-accent-400" />
                        <h3 className="text-small font-black text-white uppercase tracking-widest">
                            Weekly Summary
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-white/3 border border-white/6 rounded-xl p-3">
                            <p className="text-micro font-black uppercase tracking-widest text-neutral-500 mb-1">Volume</p>
                            <p className="text-base font-mono font-bold text-white leading-none">
                                {analytics.totalWeeklyVolume.toLocaleString()}
                                <span className="text-micro font-bold text-neutral-600 ml-1">{weightUnit}</span>
                            </p>
                        </div>
                        <div className="bg-white/3 border border-white/6 rounded-xl p-3">
                            <p className="text-micro font-black uppercase tracking-widest text-neutral-500 mb-1">Weight</p>
                            <p className="text-base font-mono font-bold text-white leading-none">
                                {analytics.todayBw ? `${analytics.todayBw.weight}` : "—"}
                                {analytics.todayBw && <span className="text-micro font-bold text-neutral-600 ml-1">{weightUnit}</span>}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
