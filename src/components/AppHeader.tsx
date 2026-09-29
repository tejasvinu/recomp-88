'use client';

import { Calculator, ChevronLeft, ChevronRight, Clock, Play, RotateCcw, Settings } from 'lucide-react';
import { cn, formatTime } from '../utils';
import { useAppStore } from '../store/appStore';

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
    const setActiveTab = useAppStore((s) => s.setActiveTab);
    const activeDayIndex = useAppStore((s) => s.activeDayIndex);
    const setActiveDayIndex = useAppStore((s) => s.setActiveDayIndex);
    const workoutTemplate = useAppStore((s) => s.workoutTemplate);
    const clampedActiveDayIndex = Math.min(activeDayIndex, Math.max(workoutTemplate.length - 1, 0));
    const activeDay = workoutTemplate[clampedActiveDayIndex];
    const onSetActiveDayIndex = setActiveDayIndex;
    const canGoPrevious = clampedActiveDayIndex > 0;
    const canGoNext = clampedActiveDayIndex < workoutTemplate.length - 1;
    const goToDay = (nextIndex: number) => {
        const clampedNext = Math.min(Math.max(nextIndex, 0), Math.max(workoutTemplate.length - 1, 0));
        onSetActiveDayIndex(clampedNext);
        if (activeTab === 'workout') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-2xl border-b border-white/6 px-4 pt-4 pb-3">
            {/* Brand + action buttons row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-1.5">
                    <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-accent-400">Recomp</h1>
                    <span className="text-2xl font-black uppercase tracking-[0.12em] text-white/90">88</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Workout timer stays visible if the user leaves Tracker mid-session. */}
                    {(isTimerRunning || isTimerPaused) && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onTogglePause}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95',
                                    isTimerPaused
                                        ? 'bg-warn-400/10 border-warn-400/20 text-warn-400'
                                        : 'bg-white/5 border-white/8 text-accent-400 hover:bg-white/10',
                                )}
                                aria-label={isTimerPaused ? 'Resume workout' : 'Pause workout'}
                            >
                                {isTimerPaused ? (
                                    <Play size={12} className="text-warn-400" />
                                ) : (
                                    <Clock size={12} className="text-accent-400" />
                                )}
                                <span
                                    className={cn(
                                        'text-[11px] font-mono font-bold tabular-nums',
                                        isTimerPaused ? 'text-warn-400' : 'text-accent-400',
                                    )}
                                >
                                    {formatTime(elapsedSeconds)}
                                </span>
                            </button>
                            <button
                                onClick={onResetTimer}
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-danger-400 hover:bg-danger-400/10 hover:border-danger-400/20 transition-all active:scale-90"
                                aria-label="Reset workout timer"
                                title="Reset timer"
                            >
                                <RotateCcw size={11} />
                            </button>
                        </div>
                    )}

                    {/* Plate calculator shortcut */}
                    <button
                        onClick={onShowPlateCalc}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-neutral-500 hover:text-accent-400 hover:bg-accent-400/10 hover:border-accent-400/20 transition-all"
                        aria-label="Open plate calculator"
                    >
                        <Calculator size={15} />
                    </button>

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

            {activeTab !== 'workout' && activeDay && (
                <div className="mb-3 rounded-2xl border border-white/7 bg-white/3 px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-600">
                            Active workout
                        </p>
                        <p className="text-[12px] font-bold text-neutral-200 truncate mt-0.5">
                            D{activeDay.dayNumber} · {activeDay.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono font-bold text-accent-400 tabular-nums">
                            {progressPercent}%
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('workout');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="rounded-lg border border-accent-400/25 bg-accent-400/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-accent-400 hover:bg-accent-400/16 transition-all"
                        >
                            Open
                        </button>
                    </div>
                </div>
            )}

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
                                className="h-full bg-accent-400 shadow-[0_0_8px_color-mix(in_oklab,_var(--color-accent-400)_60%,_transparent)] transition-all duration-700 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-accent-400 tabular-nums shrink-0">
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
                                onClick={() => goToDay(idx)}
                                role="tab"
                                aria-selected={clampedActiveDayIndex === idx}
                                className={cn(
                                    'snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 border',
                                    clampedActiveDayIndex === idx
                                        ? 'bg-accent-400 text-neutral-950 border-accent-400 shadow-[0_0_12px_color-mix(in_oklab,_var(--color-accent-400)_25%,_transparent)]'
                                        : 'bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300',
                                )}
                            >
                                D{day.dayNumber}
                            </button>
                        ))}
                    </div>

                    {activeDay && (
                        <div className="flex items-center justify-between mt-2 gap-2">
                            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest truncate">
                                {activeDay.name}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest hidden min-[380px]:inline">
                                    tap or swipe
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToDay(clampedActiveDayIndex - 1)}
                                    disabled={!canGoPrevious}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/8 bg-white/4 text-neutral-500 hover:text-white hover:bg-white/8 transition-all disabled:opacity-30 disabled:hover:bg-white/4 disabled:hover:text-neutral-500"
                                    aria-label="Previous workout day"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goToDay(clampedActiveDayIndex + 1)}
                                    disabled={!canGoNext}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/8 bg-white/4 text-neutral-500 hover:text-white hover:bg-white/8 transition-all disabled:opacity-30 disabled:hover:bg-white/4 disabled:hover:text-neutral-500"
                                    aria-label="Next workout day"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </header>
    );
}
