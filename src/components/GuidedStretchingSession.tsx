'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StretchingProgram, Stretch } from '../types';
import { X, Play, Pause, SkipForward, RotateCcw, CheckCircle2, Timer } from 'lucide-react';
import { cn, formatTime } from '../utils';

interface GuidedStretchingSessionProps {
    program: StretchingProgram;
    onClose: () => void;
    soundEnabled: boolean;
}

export default function GuidedStretchingSession({ program, onClose, soundEnabled }: GuidedStretchingSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(program.stretches[0].duration);
    const [isActive, setIsActive] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [sideIndex, setSideIndex] = useState(0); // 0-based index for multi-side stretches
    const BREAK_DURATION = 10;

    const audioCtxRef = useRef<AudioContext | null>(null);
    const wakeLockRef = useRef<any | null>(null);

    const playSound = useCallback((type: 'tick' | 'complete' | 'break') => {
        if (!soundEnabled) return;
        try {
            if (!audioCtxRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;
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
    }, [soundEnabled]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 4 && prev > 1) playSound('tick');
                    return prev - 1;
                });
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            if (isBreak) {
                setIsBreak(false);
                setSideIndex(0);
                setTimeLeft(program.stretches[currentIndex].duration);
                playSound('complete');
            } else {
                const currentStretch = program.stretches[currentIndex];
                const sides = currentStretch.sides ?? 1;

                // If this stretch should be done on multiple sides (e.g. each hand),
                // repeat the timer for each side before moving on.
                if (sides > 1 && sideIndex < sides - 1) {
                    setSideIndex(prev => prev + 1);
                    setTimeLeft(currentStretch.duration);
                    playSound('break');
                } else {
                    if (currentIndex < program.stretches.length - 1) {
                        setIsBreak(true);
                        setTimeLeft(BREAK_DURATION);
                        setCurrentIndex(prev => prev + 1);
                        setSideIndex(0);
                        playSound('break');
                    } else {
                        setIsActive(false);
                        setIsComplete(true);
                        playSound('complete');
                    }
                }
            }
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, currentIndex, isBreak, program.stretches, playSound, sideIndex]);

    // Keep the screen awake while the timer is actively running (where supported).
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
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
                <p className="text-neutral-400 mb-8 max-w-xs">You've finished the {program.name} program. Great job!</p>
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
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col text-white overflow-hidden">
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
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-neutral-400 active:scale-90 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                    {/* Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-white/5"
                        />
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={753.98}
                            strokeDashoffset={753.98 * (1 - progress / 100)}
                            className={cn("transition-all duration-1000 ease-linear", isBreak ? "text-amber-400" : "text-lime-400")}
                            strokeLinecap="round"
                        />
                    </svg>
                    
                    <div className="text-center">
                        <span className={cn("text-7xl font-black tabular-nums tracking-tighter", isBreak ? "text-amber-400" : "text-white")}>
                            {timeLeft}
                        </span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-1">Seconds</p>
                    </div>
                </div>

                <div className="text-center max-w-sm">
                    <h2 className={cn("text-2xl font-black uppercase tracking-tight mb-3", isBreak ? "text-amber-400" : "text-white")}>
                        {isBreak ? currentStretch.name : currentStretch.name}
                    </h2>
                    <p className="text-neutral-400 text-sm leading-relaxed min-h-[3rem]">
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

            {/* Footer Controls */}
            <div className="p-8 pb-12 flex items-center justify-center gap-8">
                <button 
                    onClick={() => {
                        setTimeLeft(isBreak ? BREAK_DURATION : currentStretch.duration);
                        if (!isBreak) {
                            setSideIndex(0);
                        }
                        setIsActive(false);
                    }}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-neutral-400 active:scale-90 transition-all"
                >
                    <RotateCcw size={24} />
                </button>

                <button 
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                        "w-20 h-20 flex items-center justify-center rounded-3xl transition-all active:scale-95 shadow-2xl",
                        isActive ? "bg-white text-neutral-950" : "bg-lime-400 text-neutral-950"
                    )}
                >
                    {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    onClick={() => setTimeLeft(0)}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-neutral-400 active:scale-90 transition-all"
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
