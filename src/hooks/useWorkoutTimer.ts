import { useState, useEffect, useCallback, useRef } from "react";

export function useWorkoutTimer() {
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
    const [pausedAt, setPausedAt] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const shouldSkipPersist = useRef(true);

    useEffect(() => {
        try {
            const startVal = localStorage.getItem("recomp88-timer-start");
            const pausedVal = localStorage.getItem("recomp88-timer-paused");
            const start = startVal ? parseInt(startVal, 10) : null;
            const paused = pausedVal ? parseInt(pausedVal, 10) : null;

            if (start !== null) {
                setWorkoutStartTime(start);
                const now = paused !== null ? paused : Date.now();
                setElapsedSeconds(Math.floor((now - start) / 1000));
            }
            if (paused !== null) {
                setPausedAt(paused);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (shouldSkipPersist.current) {
            shouldSkipPersist.current = false;
            return;
        }
        try {
            if (workoutStartTime === null) {
                localStorage.removeItem("recomp88-timer-start");
            } else {
                localStorage.setItem("recomp88-timer-start", workoutStartTime.toString());
            }
            if (pausedAt === null) {
                localStorage.removeItem("recomp88-timer-paused");
            } else {
                localStorage.setItem("recomp88-timer-paused", pausedAt.toString());
            }
        } catch {
            // ignore
        }
    }, [workoutStartTime, pausedAt]);

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

