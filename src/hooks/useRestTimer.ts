import { useState, useEffect, useRef, useCallback } from "react";

interface UseRestTimerOptions {
    soundEnabled: boolean;
    strengthDuration: number;
    hypertrophyDuration: number;
}

export function useRestTimer({
    soundEnabled,
    strengthDuration,
    hypertrophyDuration,
}: UseRestTimerOptions) {
    const [restTimer, setRestTimer] = useState<number | null>(null);
    const [restTimerDuration, setRestTimerDuration] = useState(90);
    const [restType, setRestType] = useState<"strength" | "hypertrophy" | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                const AudioCtx =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;
            const beepAt = (delay: number, freq: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.28, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.28);
            };
            beepAt(0, 880);
            beepAt(0.18, 880);
            beepAt(0.36, 1047);
        } catch {
            // AudioContext not available — silent fail
        }
    }, []);

    // Countdown tick
    useEffect(() => {
        if (restTimer === null || isPaused) return;
        if (restTimer <= 0) {
            setRestTimer(null);
            setRestType(null);
            if (soundEnabled) playSound();
            if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 150]);
            return;
        }
        const interval = setInterval(() => {
            setRestTimer((t) => (t !== null && t > 0 ? t - 1 : null));
        }, 1000);
        return () => clearInterval(interval);
    }, [restTimer, soundEnabled, isPaused, playSound]);

    const startTimer = useCallback(
        (type: "strength" | "hypertrophy") => {
            const duration = type === "strength" ? strengthDuration : hypertrophyDuration;
            setRestTimerDuration(duration);
            setRestTimer(duration);
            setRestType(type);
            setIsPaused(false);
        },
        [strengthDuration, hypertrophyDuration]
    );

    const dismissTimer = useCallback(() => {
        setRestTimer(null);
        setRestType(null);
        setIsPaused(false);
    }, []);

    const togglePause = useCallback(() => {
        setIsPaused((p) => !p);
    }, []);

    const timerPercent =
        restTimerDuration > 0 && restTimer !== null ? (restTimer / restTimerDuration) * 100 : 0;

    return {
        restTimer,
        restTimerDuration,
        restType,
        isPaused,
        timerPercent,
        startTimer,
        dismissTimer,
        togglePause,
    };
}
