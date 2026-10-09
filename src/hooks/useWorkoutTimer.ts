import { useState, useEffect, useCallback, useRef } from "react";
import { snapshotPlan, type SessionTiming } from "../lib/sessionMetadata";
import type { DayRoutine } from "../types";
import { readLocalStorageValue, writeLocalStorageValue } from "../services/storageService";

interface PersistedWorkoutTimer {
    workoutStartTime: number | null;
    pausedAt: number | null;
    elapsedSeconds: number;
}

const readPersistedWorkoutTimer = (): PersistedWorkoutTimer => {
    if (typeof window === "undefined") {
        return { workoutStartTime: null, pausedAt: null, elapsedSeconds: 0 };
    }

    try {
        const startVal = window.localStorage.getItem("recomp88-timer-start");
        const pausedVal = window.localStorage.getItem("recomp88-timer-paused");
        const start = startVal ? parseInt(startVal, 10) : null;
        const paused = pausedVal ? parseInt(pausedVal, 10) : null;

        if (start === null || !Number.isFinite(start)) {
            return { workoutStartTime: null, pausedAt: null, elapsedSeconds: 0 };
        }

        const safePaused = paused !== null && Number.isFinite(paused) ? paused : null;
        const now = safePaused ?? Date.now();
        return {
            workoutStartTime: start,
            pausedAt: safePaused,
            elapsedSeconds: Math.max(0, Math.floor((now - start) / 1000)),
        };
    } catch {
        return { workoutStartTime: null, pausedAt: null, elapsedSeconds: 0 };
    }
};

export function useWorkoutTimer() {
    const [metadata, setMetadata] = useState<SessionTiming>(() => readLocalStorageValue("recomp88-session-timing", {}));
    useEffect(() => { writeLocalStorageValue("recomp88-session-timing", metadata); }, [metadata]);
    const [initialTimer] = useState(readPersistedWorkoutTimer);
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(initialTimer.workoutStartTime);
    const [pausedAt, setPausedAt] = useState<number | null>(initialTimer.pausedAt);
    const [elapsedSeconds, setElapsedSeconds] = useState(initialTimer.elapsedSeconds);
    const shouldSkipPersist = useRef(true);

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

    const start = useCallback((day?: DayRoutine) => {
        if (workoutStartTime === null) {
            setWorkoutStartTime(Date.now());
            setMetadata({ startedAt: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...(day ? snapshotPlan(day) : {}) });
        }
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
        setMetadata({});
        setWorkoutStartTime(null);
        setPausedAt(null);
        setElapsedSeconds(0);
    }, []);

    const isRunning = workoutStartTime !== null && pausedAt === null;
    const isPaused = pausedAt !== null;

    const getSessionMetadata = useCallback(() => metadata, [metadata]);
    return { elapsedSeconds, isRunning, isPaused, start, togglePause, getDuration, getSessionMetadata, reset };
}

