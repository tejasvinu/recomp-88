'use client';

import { Calculator, Clock, Play, RotateCcw, Settings } from 'lucide-react';
import { cn, formatTime } from '../utils';
import { useAppStore, selectSafeWorkoutTemplate } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';

interface AppHeaderProps {
    progressPercent: number;
    isTimerRunning: boolean;
    isTimerPaused: boolean;
    elapsedSeconds: number;
    onTogglePause: () => void;
    onResetTimer: () => void;
    onShowPlateCalc: () => void;
    onShowSettings: () => void;
}

/**
 * Sticky application header: brand, workout timer, plate calculator shortcut,
 * settings icon, progress bar, and workout-day pills.
 *
 * Rendered inline inside App.tsx — ready to be promoted into layout.tsx once
 * the tab navigation is also server-rendered.
 */
export default function AppHeader({
    progressPercent,
    isTimerRunning,
    isTimerPaused,
    elapsedSeconds,
    onTogglePause,
    onResetTimer,
    onShowPlateCalc,
    onShowSettings,
}: AppHeaderProps) {
    const activeTab = useAppStore((s) => s.activeTab);
    const activeDayIndex = useAppStore((s) => s.activeDayIndex);
    const setActiveDayIndex = useAppStore((s) => s.setActiveDayIndex);
    const workoutTemplate = useAppStore((s) => s.workoutTemplate);
    const clampedActiveDayIndex = Math.min(activeDayIndex, Math.max(workoutTemplate.length - 1, 0));
    const activeDay = workoutTemplate[clampedActiveDayIndex];
    const onSetActiveDayIndex = setActiveDayIndex;
    return (
        <header className="sticky top-0 z-40 bg-[#080808]/80 backdrop-blur-2xl border-b border-white/6 px-4 pt-4 pb-3">
            {/* Brand + action buttons row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-1.5">
                    <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-lime-400">Recomp</h1>
                    <span className="text-2xl font-black uppercase tracking-[0.12em] text-white/90">88</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Workout timer (only when on the workout tab and running/paused) */}
                    {activeTab === 'workout' && (isTimerRunning || isTimerPaused) && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onTogglePause}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95',
                                    isTimerPaused
                                        ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                                        : 'bg-white/5 border-white/8 text-lime-400 hover:bg-white/10',
                                )}
                                aria-label={isTimerPaused ? 'Resume workout' : 'Pause workout'}
                            >
                                {isTimerPaused ? (
                                    <Play size={12} className="text-amber-400" />
                                ) : (
                                    <Clock size={12} className="text-lime-400" />
                                )}
                                <span
                                    className={cn(
                                        'text-[11px] font-mono font-bold tabular-nums',
                                        isTimerPaused ? 'text-amber-400' : 'text-lime-400',
                                    )}
                                >
                                    {formatTime(elapsedSeconds)}
                                </span>
                            </button>
                            <button
                                onClick={onResetTimer}
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all active:scale-90"
                                aria-label="Reset workout timer"
                                title="Reset timer"
                            >
                                <RotateCcw size={11} />
                            </button>
                        </div>
                    )}

                    {/* Plate calculator shortcut */}
                    {activeTab === 'workout' && (
                        <button
                            onClick={onShowPlateCalc}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-lime-400 hover:bg-lime-400/10 hover:border-lime-400/20 transition-all"
                            aria-label="Open plate calculator"
                        >
                            <Calculator size={15} />
                        </button>
                    )}

                    {/* Settings */}
                    <button
                        onClick={onShowSettings}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-neutral-300 hover:bg-white/8 transition-all"
                        aria-label="Open settings"
                    >
                        <Settings size={15} />
                    </button>
                </div>
            </div>

            {/* Workout-tab sub-header: progress bar + day pills */}
            {activeTab === 'workout' && (
                <>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="flex-1 bg-white/6 h-1.5 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={progressPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div
                                className="h-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)] transition-all duration-700 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums shrink-0">
                            {progressPercent}%
                        </span>
                    </div>

                    {/* Day pills */}
                    <div
                        className="flex overflow-x-auto gap-1.5 scrollbar-none snap-x -mx-0.5 px-0.5"
                        role="tablist"
                        aria-label="Workout days"
                    >
                        {workoutTemplate.map((day, idx) => (
                            <button
                                key={day.id}
                                onClick={() => onSetActiveDayIndex(idx)}
                                role="tab"
                                aria-selected={activeDayIndex === idx}
                                className={cn(
                                    'snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 border',
                                    activeDayIndex === idx
                                        ? 'bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.25)]'
                                        : 'bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300',
                                )}
                            >
                                D{day.dayNumber}
                            </button>
                        ))}
                    </div>

                    {activeDay && (
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">
                                {activeDay.name}
                            </p>
                            <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest">
                                swipe to change day
                            </p>
                        </div>
                    )}
                </>
            )}
        </header>
    );
}
