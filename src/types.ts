export interface SetData {
    id: string;
    targetReps: string;
    completed: boolean;
    loggedWeight: string;
    loggedReps: string;
}

export interface Exercise {
    id: string;
    name: string;
    type: "strength" | "hypertrophy" | "other"; // determines rest timer (strength: 120s, hyper: 90s, other: no timer)
    sets: SetData[];
    details?: string; // e.g. "45 mins" for cardio
}

export interface DayRoutine {
    id: string;
    dayNumber: number;
    title: string;
    name: string; // e.g., "Heavy Push"
    exercises: Exercise[];
}

// How we'll save the user's progress for a set
export interface SavedSetState {
    completed: boolean;
    loggedWeight: string;
    loggedReps: string;
}

// Flat structure per day: dayId -> exerciseId -> setId -> SavedSetState
export type WorkoutProgress = Record<string, Record<string, Record<string, SavedSetState>>>;

// ─── Session History ───────────────────────────────────────────────────────
export interface SessionSet {
    setId: string;
    loggedWeight: string;
    loggedReps: string;
}

export interface SessionExercise {
    exerciseId: string;
    name: string;
    type: "strength" | "hypertrophy" | "other";
    sets: SessionSet[];
}

export interface WorkoutSession {
    id: string;
    date: string; // ISO 8601 date string
    dayId: string;
    dayName: string;
    exercises: SessionExercise[];
    duration?: number; // seconds
}

export type SessionHistory = WorkoutSession[];

// ─── Body Weight ───────────────────────────────────────────────────────────
export interface BodyWeightEntry {
    date: string; // YYYY-MM-DD
    weight: number;
}
