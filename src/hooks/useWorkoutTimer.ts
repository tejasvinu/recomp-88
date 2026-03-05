import { useState, useEffect, useCallback } from "react";

export function useWorkoutTimer() {
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(() => {
        try {
            const val = localStorage.getItem("recomp88-timer-start");
            return val ? parseInt(val, 10) : null;
        } catch {
            return null;
        }
    });

    const [pausedAt, setPausedAt] = useState<number | null>(() => {
        try {
            const val = localStorage.getItem("recomp88-timer-paused");
            return val ? parseInt(val, 10) : null;
        } catch {
            return null;
        }
    });

    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        try {
            if (workoutStartTime === null) {
                localStorage.removeItem("recomp88-timer-start");
            } else {
                localStorage.setItem("recomp88-timer-start", workoutStartTime.toString());
            }
        } catch {
            // ignore
        }
    }, [workoutStartTime]);

    useEffect(() => {
        try {
            if (pausedAt === null) {
                localStorage.removeItem("recomp88-timer-paused");
            } else {
                localStorage.setItem("recomp88-timer-paused", pausedAt.toString());
            }
        } catch {
            // ignore
        }
    }, [pausedAt]);

    useEffect(() => {
        if (workoutStartTime === null) return;

        const calcElapsed = () => {
            const now = pausedAt !== null ? pausedAt : Date.now();
            setElapsedSeconds(Math.floor((now - workoutStartTime) / 1000));
        };

        calcElapsed();

        if (pausedAt !== null) return;

        const interval = setInterval(calcElapsed, 1000);
        return () => clearInterval(interval);
    }, [workoutStartTime, pausedAt]);

    const start = useCallback(() => {
        if (workoutStartTime === null) setWorkoutStartTime(Date.now());
    }, [workoutStartTime]);

    const pause = useCallback(() => {
        if (workoutStartTime !== null && pausedAt === null) {
            setPausedAt(Date.now());
        }
    }, [workoutStartTime, pausedAt]);

    const resume = useCallback(() => {
        if (workoutStartTime !== null && pausedAt !== null) {
            // Shift the start time forward by the duration of the pause
            const pauseDuration = Date.now() - pausedAt;
            setWorkoutStartTime(prev => prev! + pauseDuration);
            setPausedAt(null);
        }
    }, [workoutStartTime, pausedAt]);

    const togglePause = useCallback(() => {
        if (pausedAt === null) {
            pause();
        } else {
            resume();
        }
    }, [pausedAt, pause, resume]);

    const getDuration = useCallback(() => {
        if (workoutStartTime === null) return undefined;
        const end = pausedAt !== null ? pausedAt : Date.now();
        return Math.floor((end - workoutStartTime) / 1000);
    }, [workoutStartTime, pausedAt]);

    const reset = useCallback(() => {
        setWorkoutStartTime(null);
        setPausedAt(null);
        setElapsedSeconds(0);
    }, []);

    const isRunning = workoutStartTime !== null && pausedAt === null;
    const isPaused = pausedAt !== null;

    return { elapsedSeconds, isRunning, isPaused, start, togglePause, getDuration, reset };
}

