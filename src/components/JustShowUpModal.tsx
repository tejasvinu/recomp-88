'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Flame, Play, Pause, RotateCcw, Check, Zap, PartyPopper,
} from "lucide-react";
import { cn } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";
import type { Exercise, WorkoutSession } from "../types";

// How much we trim the real routine down to for a "just show up" session.
const QUICK_EXERCISE_LIMIT = 3;
const QUICK_SET_LIMIT = 2;
// Target window (seconds). 15 minutes.
const TARGET_SECONDS = 15 * 60;

interface JustShowUpModalProps {
    dayName: string;
    exercises: Exercise[];
    onComplete: (session: WorkoutSession) => void;
    onClose: () => void;
}

/**
 * "Just Show Up" — a 15-minute, zero-pressure session for the days when the
 * full routine feels impossible. Keeps the habit alive by counting toward the
 * streak while staying completely separate from the user's real planned day.
 */
export default function JustShowUpModal({
    dayName,
    exercises,
    onComplete,
    onClose,
}: JustShowUpModalProps) {
    useModalEscape(onClose);

    const [remaining, setRemaining] = useState(TARGET_SECONDS);
    const [running, setRunning] = useState(false);
    const [doneIds, setDoneIds] = useState<Record<string, boolean>>(() => ({}));
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Build the trimmed quick plan from today's routine.
    const plan = useMemo(() => {
        return exercises
            .filter((ex) => ex.sets.length > 0)
            .slice(0, QUICK_EXERCISE_LIMIT)
            .map((ex) => ({
                id: ex.id,
                name: ex.name,
                sets: ex.sets.slice(0, QUICK_SET_LIMIT),
            }));
    }, [exercises]);
    // Countdown from 15:00 (optional — just a friendly "beat the clock" frame).
    useEffect(() => {
        if (!running) return;
        intervalRef.current = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    setRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    // Tidy up when the modal unmounts.
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const completedCount = Object.values(doneIds).filter(Boolean).length;
    const totalSets = plan.reduce((acc, ex) => acc + ex.sets.length, 0);

    const toggleSet = (exerciseId: string, setId: string) => {
        setDoneIds((prev) => ({
            ...prev,
            [`${exerciseId}:${setId}`]: !prev[`${exerciseId}:${setId}`],
        }));
    };

    const handleComplete = () => {
        const elapsed = TARGET_SECONDS - remaining;
        const session: WorkoutSession = {
            id: `just-show-up-${Date.now()}`,
            date: new Date().toISOString(),
            dayId: "just-show-up",
            dayName: "Just Show Up",
            exercises: plan
                .map((ex) => ({
                    exerciseId: ex.id,
                    name: ex.name,
                    type: "hypertrophy" as const,
                    sets: ex.sets
                        .filter((s) => doneIds[`${ex.id}:${s.id}`])
                        .map((s) => ({
                            setId: s.id,
                            targetReps: s.targetReps,
                            loggedWeight: "",
                            loggedReps: "",
                            completed: true,
                            completedAt: Date.now(),
                        })),
                }))
                .filter((ex) => ex.sets.length > 0),
            ...(elapsed > 0 ? { duration: elapsed } : {}),
        };
        onComplete(session);
    };

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timerStatic = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    // Circular progress for the countdown.
    const CIRCLE = 2 * Math.PI * 56;
    const timerFrac = remaining / TARGET_SECONDS;
    const completeFrac = totalSets ? completedCount / totalSets : 0;

    return (
        <div
            className="fixed inset-0 z-70 flex items-end sm:items-center justify-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="just-show-up-title"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md bg-sheet border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up p-5 max-h-[92vh] flex flex-col"
            >
                <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-accent-400/10 border border-accent-400/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Flame size={22} className="text-accent-400" />
                        </div>
                        <div>
                            <h3
                                id="just-show-up-title"
                                className="text-[17px] font-black text-white tracking-wide leading-tight"
                            >
                                Just Show Up
                            </h3>
                            <p className="text-caption text-neutral-500 font-medium mt-0.5">
                                15 minutes is enough. It counts.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-9 h-9 rounded-xl border border-white/8 bg-white/4 text-neutral-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable middle */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
                    <p className="text-small text-neutral-400 leading-relaxed">
                        No PRs. No pressure. Just get in and move for a little while —{" "}
                        <span className="text-accent-400 font-bold">anything counts today.</span>{" "}
                        {dayName && (
                            <>
                                We trimmed <span className="text-white font-bold">{dayName}</span>{" "}
                                down to a taste:
                            </>
                        )}
                    </p>

                    {/* Quick plan */}
                    {plan.length === 0 ? (
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                            <p className="text-small text-neutral-300">
                                Today&apos;s routine has no sets to trim — so showing up as-is is a
                                complete win. Skip to the countdown and move anyway!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {plan.map((ex, exIdx) => (
                                <div
                                    key={ex.id}
                                    className="rounded-2xl border border-white/6 bg-white/3 p-3"
                                >
                                    <p className="text-small font-black text-white tracking-wide mb-2">
                                        {exIdx + 1}. {ex.name}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {ex.sets.map((s, setIdx) => {
                                            const key = `${ex.id}:${s.id}`;
                                            const done = !!doneIds[key];
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => toggleSet(ex.id, s.id)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-small font-bold transition-all active:scale-95 min-w-[64px] justify-center",
                                                        done
                                                            ? "bg-accent-400/15 border-accent-400/40 text-accent-400"
                                                            : "bg-white/4 border-white/8 text-neutral-400 hover:bg-white/8"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                                                            done
                                                                ? "bg-accent-400 border-accent-400 text-neutral-950"
                                                                : "border-white/25"
                                                        )}
                                                    >
                                                        {done && <Check size={11} strokeWidth={3.5} />}
                                                    </span>
                                                    Set {setIdx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <p className="text-mini text-neutral-600 px-1">
                                Tick a set when you finish it — or don&apos;t. Showing up is the whole
                                point.
                            </p>
                        </div>
                    )}

                    {/* Countdown */}
                    <div className="rounded-2xl border border-white/6 bg-white/3 p-4 flex flex-col items-center">
                        <div className="relative w-[132px] h-[132px]">
                            <svg width="132" height="132" viewBox="0 0 132 132">
                                <circle
                                    cx="66" cy="66" r="56" fill="none"
                                    stroke="rgba(255,255,255,0.08)" strokeWidth="8"
                                />
                                <circle
                                    cx="66" cy="66" r="56" fill="none"
                                    stroke="color-mix(in oklab, var(--color-accent-400) 90%, transparent)" strokeWidth="8"
                                    strokeLinecap="round" strokeDasharray={CIRCLE}
                                    strokeDashoffset={CIRCLE * (1 - timerFrac)}
                                    transform="rotate(-90 66 66)"
                                    style={{ transition: "stroke-dashoffset 1s linear" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-mono font-bold text-white tabular-nums leading-none">
                                    {timerStatic}
                                </span>
                                <span className="text-micro uppercase tracking-widest font-black text-neutral-500 mt-1">
                                    window
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 w-full">
                            {running ? (
                                <button
                                    onClick={() => setRunning(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/8 bg-white/5 text-white font-bold text-small hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <Pause size={14} /> Pause
                                </button>
                            ) : (
                                <button
                                    onClick={() =>
                                        setRemaining((prev) => (prev === 0 ? TARGET_SECONDS : prev))
                                    }
                                    className="flex-1 py-2.5 rounded-xl border border-white/8 bg-white/5 text-white font-bold text-small hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <Play size={14} /> {remaining === TARGET_SECONDS ? "Start" : "Resume"}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setRunning(false);
                                    setRemaining(TARGET_SECONDS);
                                }}
                                className="py-2.5 px-3 rounded-xl border border-white/8 bg-white/4 text-neutral-400 hover:text-white hover:bg-white/8 transition-all active:scale-95 flex items-center justify-center"
                                aria-label="Reset timer"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {totalSets > 0 && (
                        <div>
                            <div className="flex items-center justify-between text-mini font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                                <span className="flex items-center gap-1">
                                    <Zap size={11} className="text-accent-400" />
                                    Keep it rolling
                                </span>
                                <span className="font-mono text-accent-400">
                                    {completedCount}/{totalSets}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-white/6 overflow-hidden">
                                <div
                                    className="h-full bg-accent-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round(completeFrac * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 mt-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-white/8 bg-white/4 text-neutral-400 font-bold text-body hover:bg-white/8 hover:text-white transition-all active:scale-95"
                    >
                        Not today
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex-[2] py-3 rounded-xl border border-accent-400/30 bg-accent-400/15 text-accent-400 font-black text-body hover:bg-accent-400/25 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_18px_color-mix(in_oklab,_var(--color-accent-400)_12%,_transparent)]"
                    >
                        <PartyPopper size={15} />
                        Count it — I showed up
                    </button>
                </div>
                <p className="text-center text-micro text-neutral-700 mt-3 font-medium shrink-0">
                    Saves a lightweight session that keeps your streak alive without touching your
                    real workout plan.
                </p>
            </div>
        </div>
    );
}




