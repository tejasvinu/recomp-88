import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

const useIsomorphicLayoutEffect =
    typeof document !== "undefined" ? useLayoutEffect : useEffect;

interface UseRestTimerOptions {
    soundEnabled: boolean;
    strengthDuration: number;
    hypertrophyDuration: number;
}

interface RestState {
    endTime: number | null;
    duration: number;
    type: "strength" | "hypertrophy" | null;
    pausedRemaining: number | null;
}

const DEFAULT_REST_STATE: RestState = { endTime: null, duration: 90, type: null, pausedRemaining: null };

export function useRestTimer({
    soundEnabled,
    strengthDuration,
    hypertrophyDuration,
}: UseRestTimerOptions) {
    const [state, setState] = useState<RestState>(DEFAULT_REST_STATE);
    const shouldSkipPersist = useRef(true);

    useIsomorphicLayoutEffect(() => {
        try {
            const val = localStorage.getItem("recomp88-rest-state");
            if (val) {
                const parsed = JSON.parse(val);
                setState({
                    endTime: typeof parsed.endTime === "number" ? parsed.endTime : null,
                    duration: typeof parsed.duration === "number" ? parsed.duration : 90,
                    type: (parsed.type === "strength" || parsed.type === "hypertrophy") ? parsed.type : null,
                    pausedRemaining: typeof parsed.pausedRemaining === "number" ? parsed.pausedRemaining : null
                });
            }
        } catch { /* empty */ }
    }, []);

    const [restTimer, setRestTimer] = useState<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const ensureAudioContext = useCallback(() => {
        if (!soundEnabled) return null;

        try {
            if (!audioCtxRef.current) {
                const AudioCtx =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (!AudioCtx) return null;
                audioCtxRef.current = new AudioCtx();
            }

            if (audioCtxRef.current.state === "suspended") {
                void audioCtxRef.current.resume().catch(() => {});
            }

            return audioCtxRef.current;
        } catch {
            return null;
        }
    }, [soundEnabled]);

    const playSound = useCallback(() => {
        try {
            const ctx = ensureAudioContext();
            if (!ctx || ctx.state !== "running") return;
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
    }, [ensureAudioContext]);

    useEffect(() => {
        if (shouldSkipPersist.current) {
            shouldSkipPersist.current = false;
            return;
        }
        try {
            if (state.endTime === null && state.pausedRemaining === null) {
                localStorage.removeItem("recomp88-rest-state");
            } else {
                localStorage.setItem("recomp88-rest-state", JSON.stringify(state));
            }
        } catch { /* empty */ }
    }, [state]);

    // calculate on state change and run timer
    useEffect(() => {
        // If it's paused or stopped, no interval required
        if (state.pausedRemaining !== null) {
            setTimeout(() => setRestTimer(state.pausedRemaining), 0);
            return;
        }
        if (state.endTime === null) {
            setTimeout(() => setRestTimer(null), 0);
            return;
        }

        const calc = () => {
            const now = Date.now();
            const left = Math.ceil((state.endTime! - now) / 1000);
            if (left <= 0) {
                setState(s => ({ ...s, endTime: null, type: null, pausedRemaining: null }));
                setRestTimer(null);
                if (soundEnabled) playSound();
                if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 150]);
            } else {
                setRestTimer(left);
            }
        };

        calc();
        if (state.endTime! <= Date.now()) return;

        const interval = setInterval(calc, 1000);
        return () => clearInterval(interval);
    }, [state.endTime, state.pausedRemaining, soundEnabled, playSound]);

    const startTimer = useCallback(
        (type: "strength" | "hypertrophy") => {
            ensureAudioContext();
            const duration = type === "strength" ? strengthDuration : hypertrophyDuration;
            setState({
                endTime: Date.now() + duration * 1000,
                duration,
                type,
                pausedRemaining: null
            });
        },
        [ensureAudioContext, strengthDuration, hypertrophyDuration]
    );

    const dismissTimer = useCallback(() => {
        setState({ endTime: null, duration: 90, type: null, pausedRemaining: null });
        setRestTimer(null);
    }, []);

    const togglePause = useCallback(() => {
        setState(s => {
            if (s.pausedRemaining !== null) {
                // resume
                return {
                    ...s,
                    endTime: Date.now() + s.pausedRemaining * 1000,
                    pausedRemaining: null
                };
            } else if (s.endTime !== null) {
                // pause
                const left = Math.max(0, Math.ceil((s.endTime - Date.now()) / 1000));
                return {
                    ...s,
                    endTime: null,
                    pausedRemaining: left
                };
            }
            return s;
        });
    }, []);

    const timerPercent =
        state.duration > 0 && restTimer !== null ? (restTimer / state.duration) * 100 : 0;

    return {
        restTimer,
        restTimerDuration: state.duration,
        restType: state.type,
        isPaused: state.pausedRemaining !== null,
        timerPercent,
        startTimer,
        dismissTimer,
        togglePause,
    };
}
