'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StretchingProgram } from '../types';
import { X, Play, Pause, SkipForward, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';

interface GuidedStretchingSessionProps {
    program: StretchingProgram;
    onClose: () => void;
    soundEnabled: boolean;
}

interface WakeLockSentinelLike {
    release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
    wakeLock?: {
        request: (type: 'screen') => Promise<WakeLockSentinelLike>;
    };
};

type WindowWithWebkitAudioContext = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

export default function GuidedStretchingSession({ program, onClose, soundEnabled }: GuidedStretchingSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(program.stretches[0].duration);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [sideIndex, setSideIndex] = useState(0); // 0-based index for multi-side stretches
    const BREAK_DURATION = 10;

    // Absolute-time tracking: immune to mobile screen sleep
    const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
    const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

    const ensureAudioContext = useCallback(() => {
        if (!soundEnabled) return null;

        try {
            if (!audioCtxRef.current) {
                const AudioCtx =
                    window.AudioContext ||
                    (window as WindowWithWebkitAudioContext).webkitAudioContext;
                if (!AudioCtx) return null;
                audioCtxRef.current = new AudioCtx();
            }

            if (audioCtxRef.current.state === 'suspended') {
                void audioCtxRef.current.resume().catch(() => {});
            }

            return audioCtxRef.current;
        } catch {
            return null;
        }
    }, [soundEnabled]);

    const playSound = useCallback((type: 'tick' | 'complete' | 'break') => {
        if (!soundEnabled) return;
        try {
            const ctx = ensureAudioContext();
            if (!ctx || ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'tick') {
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } else if (type === 'complete') {
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'break') {
                osc.frequency.value = 660;
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [ensureAudioContext, soundEnabled]);

    // Start an absolute-time countdown for a given duration in seconds
    const startCountdown = useCallback((durationSeconds: number) => {
        setTargetEndTime(Date.now() + durationSeconds * 1000);
        setPausedRemaining(null);
        setTimeLeft(durationSeconds);
    }, []);

    const advanceToNext = useCallback(() => {
        if (isBreak) {
            setIsBreak(false);
            setSideIndex(0);
            playSound('complete');
            startCountdown(program.stretches[currentIndex].duration);
            return;
        }

        const currentStretch = program.stretches[currentIndex];
        const sides = currentStretch.sides ?? 1;

        if (sides > 1 && sideIndex < sides - 1) {
            setSideIndex((prevSide) => prevSide + 1);
            playSound('break');
            startCountdown(currentStretch.duration);
            return;
        }

        if (currentIndex < program.stretches.length - 1) {
            setIsBreak(true);
            setCurrentIndex((prevIndex) => prevIndex + 1);
            setSideIndex(0);
            playSound('break');
            startCountdown(BREAK_DURATION);
            return;
        }

        setIsActive(false);
        setIsComplete(true);
        setTargetEndTime(null);
        playSound('complete');
        setTimeLeft(0);
    }, [BREAK_DURATION, currentIndex, isBreak, playSound, program.stretches, sideIndex, startCountdown]);

    // Absolute-time interval: survives screen sleep on mobile
    useEffect(() => {
        if (!isActive || isComplete || !targetEndTime) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));

            // Play tick sounds for last 3 seconds
            if (remaining > 0 && remaining <= 3) {
                playSound('tick');
            }

            setTimeLeft(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                advanceToNext();
            }
        }, 200); // 200ms for instant catch-up on screen wake

        return () => clearInterval(interval);
    }, [isActive, isComplete, targetEndTime, advanceToNext, playSound]);

    const togglePlayback = useCallback(() => {
        if (!isActive) {
            ensureAudioContext();
            // Resuming from pause or starting fresh
            if (pausedRemaining != null) {
                // Resume: set a new absolute end time from the paused remaining
                setTargetEndTime(Date.now() + pausedRemaining * 1000);
                setPausedRemaining(null);
            } else if (!targetEndTime) {
                // First play: start countdown from current timeLeft
                setTargetEndTime(Date.now() + timeLeft * 1000);
            }
        } else {
            // Pausing: capture remaining time
            if (targetEndTime) {
                const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
                setPausedRemaining(remaining);
                setTargetEndTime(null);
            }
        }

        setIsActive((prev) => !prev);
    }, [ensureAudioContext, isActive, pausedRemaining, targetEndTime, timeLeft]);

    // Keep the screen awake while the timer is actively running (where supported).
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                const wakeLockNavigator = navigator as NavigatorWithWakeLock;
                if (wakeLockNavigator.wakeLock?.request) {
                    wakeLockRef.current = await wakeLockNavigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.log('Wake lock request failed', err);
            }
        };

        if (isActive) {
            requestWakeLock();
        } else if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {}).finally(() => {
                wakeLockRef.current = null;
            });
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {}).finally(() => {
                    wakeLockRef.current = null;
                });
            }
        };
    }, [isActive]);

    useEffect(() => {
        // Request fullscreen on mount
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => console.log("Fullscreen failed", err));
        }
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log("Exit fullscreen failed", err));
            }
        };
    }, []);

    const currentStretch = program.stretches[currentIndex];
    const sides = currentStretch.sides ?? 1;
    const progress = isBreak 
        ? (1 - timeLeft / BREAK_DURATION) * 100 
        : (1 - timeLeft / currentStretch.duration) * 100;

    if (isComplete) {
        return (
            <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-lime-400/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle2 size={48} className="text-lime-400" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">Session Complete!</h2>
                <p className="text-neutral-400 mb-8 max-w-xs">You&apos;ve finished the {program.name} program. Great job!</p>
                <button
                    onClick={onClose}
                    className="w-full max-w-xs py-4 bg-lime-400 text-neutral-950 font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                >
                    Finish
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-neutral-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 to-neutral-950 flex flex-col text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400 mb-1">{program.name}</p>
                    <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        {isBreak ? "Next Up" : currentStretch.name}
                        {!isBreak && sides > 1 && (
                            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">
                                Side {sideIndex + 1} of {sides}
                            </span>
                        )}
                    </h1>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white active:scale-90 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-2xl mx-auto w-full">
                <div className="flex flex-row items-center gap-5 sm:gap-8 mb-6 shrink-0 w-full bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl">
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex shrink-0 items-center justify-center">
                        {/* Progress Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                className="text-white/5"
                            />
                            <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={283} // 2 * pi * 45 (approx 282.7)
                                strokeDashoffset={283 * (1 - progress / 100)}
                                className={cn(
                                    "transition-all duration-1000 ease-linear",
                                    isBreak 
                                        ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                                        : "text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.5)]"
                                )}
                                strokeLinecap="round"
                            />
                        </svg>
                        
                        <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none mt-1", isBreak ? "text-amber-400" : "text-white")}>
                                {timeLeft}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-0.5 hidden sm:block">Sec</span>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 className={cn("text-lg sm:text-2xl font-black uppercase tracking-tight mb-2 leading-tight", isBreak ? "text-amber-400" : "text-white")}>
                            {isBreak ? currentStretch.name : currentStretch.name}
                        </h2>
                        <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-[280px]">
                            {isBreak
                                ? `Get ready for the next stretch.`
                                : sides > 1
                                    ? `${currentStretch.description ?? ""} ${
                                          sides === 2
                                              ? sideIndex === 0
                                                  ? "(first side)"
                                                  : "(second side)"
                                              : `(side ${sideIndex + 1} of ${sides})`
                                      }`
                                    : currentStretch.description}
                        </p>
                    </div>
                </div>

                <div className="w-full relative overflow-hidden flex-1 flex flex-col">
                    <div className="w-full h-full overflow-y-auto overscroll-contain pb-8 scrollbar-none mask-image-bottom-fade">
                            {!isBreak && ((currentStretch.instructions && currentStretch.instructions.length > 0) || (currentStretch.cues && currentStretch.cues.length > 0) || (currentStretch.commonMistakes && currentStretch.commonMistakes.length > 0)) && (
                                <div className="text-left bg-neutral-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
                                    {currentStretch.instructions && currentStretch.instructions.length > 0 && (
                                        <div>
                                            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-lime-400 mb-3 ml-2 flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-lime-400 animate-pulse"></span>
                                                Instructions
                                            </h3>
                                            <ul className="space-y-2">
                                                {currentStretch.instructions.map((inst, i) => (
                                                    <li key={i} className="text-[11px] text-neutral-300 flex items-start gap-3">
                                                        <span className="text-lime-400/50 font-mono mt-0.5 shrink-0">{i + 1}.</span> 
                                                        <span className="leading-snug">{inst}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {currentStretch.cues && currentStretch.cues.length > 0 && (
                                        <div className={cn(currentStretch.instructions?.length ? "pt-4 border-t border-white/5" : "")}>
                                            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-sky-400 mb-3 ml-2 flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-sky-400"></span>
                                                Pointers
                                            </h3>
                                            <ul className="space-y-2.5">
                                                {currentStretch.cues.map((cue, i) => (
                                                    <li key={i} className="text-[11px] text-neutral-400 flex items-start gap-3">
                                                        <span className="text-sky-400/50 font-mono mt-0.5 shrink-0 text-lg leading-[0.5] mt-1.5">·</span> 
                                                        <span className="leading-snug block">{cue}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {currentStretch.commonMistakes && currentStretch.commonMistakes.length > 0 && (
                                        <div className={cn((currentStretch.instructions?.length || currentStretch.cues?.length) ? "pt-4 border-t border-white/5" : "")}>
                                            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-red-400 mb-3 ml-2 flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"></span>
                                                Things to Notice
                                            </h3>
                                            <ul className="space-y-2">
                                                {currentStretch.commonMistakes.map((mistake, i) => (
                                                    <li key={i} className="text-[10px] font-medium text-neutral-400 flex items-start gap-2.5 bg-red-400/5 border border-red-400/10 p-2.5 rounded-lg">
                                                        <span className="text-red-400/80 font-mono shrink-0">!</span> 
                                                        <span className="leading-snug text-neutral-300">{mistake}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
            </div>

            {/* Footer Controls */}
            <div className="p-8 pb-12 flex items-center justify-center gap-8">
                <button 
                    onClick={() => {
                        const resetDuration = isBreak ? BREAK_DURATION : currentStretch.duration;
                        setTimeLeft(resetDuration);
                        setTargetEndTime(null);
                        setPausedRemaining(null);
                        if (!isBreak) {
                            setSideIndex(0);
                        }
                        setIsActive(false);
                    }}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                >
                    <RotateCcw size={24} />
                </button>

                <button 
                    onClick={togglePlayback}
                    className={cn(
                        "w-20 h-20 flex items-center justify-center rounded-3xl transition-all active:scale-95 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:bg-opacity-90",
                        isActive 
                            ? "bg-white text-neutral-950 shadow-white/20" 
                            : "bg-lime-400 text-neutral-950 shadow-lime-400/30"
                    )}
                >
                    {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    onClick={() => {
                        // Force skip: set targetEndTime to now so interval catches 0
                        setTargetEndTime(Date.now());
                        setPausedRemaining(null);
                        if (!isActive) setIsActive(true);
                    }}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                >
                    <SkipForward size={24} />
                </button>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-8">
                {program.stretches.map((_, idx) => (
                    <div 
                        key={idx}
                        className={cn(
                            "h-1 rounded-full transition-all duration-300",
                            idx === currentIndex ? "w-6 bg-lime-400" : idx < currentIndex ? "w-2 bg-lime-400/40" : "w-2 bg-white/10"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
