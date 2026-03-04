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
        if (workoutStartTime === null) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [workoutStartTime]);

    const start = useCallback(() => {
        if (workoutStartTime === null) setWorkoutStartTime(Date.now());
    }, [workoutStartTime]);

    const getDuration = useCallback(() => {
        return workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : undefined;
    }, [workoutStartTime]);

    const reset = useCallback(() => {
        setWorkoutStartTime(null);
        setElapsedSeconds(0);
    }, []);

    const isRunning = workoutStartTime !== null;

    return { elapsedSeconds, isRunning, start, getDuration, reset };
}
