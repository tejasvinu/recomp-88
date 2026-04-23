export type ExerciseEquipment =
    | "barbell"
    | "dumbbell"
    | "kettlebell"
    | "bench"
    | "bodyweight"
    | "band"
    | "machine"
    | "cable"
    | "smith-machine"
    | "landmine"
    | "pull-up-bar";

export interface ExerciseWiki {
    id: string;
    name: string;
    category: "Push" | "Pull" | "Legs" | "Core" | "Cardio/Mobility";
    muscles: {
        primary: string[];
        secondary: string[];
    };
    biomechanics: string;
    cues: string[];
    commonMistakes: string[];
    alternatives: string[];
    notes: string;
    youtubeId?: string;
    equipment?: ExerciseEquipment[];
    difficulty?: "Beginner" | "Intermediate" | "Advanced";
    movementPattern?: string;
    bestFor?: string[];
    setupChecklist?: string[];
    freeWeightAlternatives?: string[];
    minimalEquipmentAlternatives?: string[];
    homeGymFriendly?: boolean;
}

export type ExerciseType = "strength" | "hypertrophy" | "other";
export type SetType = "warmup" | "working" | "drop" | "failure";
export type ExerciseLinkType = "superset" | "circuit";
export type WeightUnit = "kg" | "lbs";

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
    type: ExerciseType; // determines rest timer (strength: 120s, hyper: 90s, other: no timer)
    sets: SetData[];
    details?: string; // e.g. "45 mins" for cardio
    linkToNext?: ExerciseLinkType;
}

export interface Stretch {
    id: string;
    name: string;
    duration: number; // seconds
    /**
     * Number of sides the stretch should be performed on (e.g. left/right hand).
     * Defaults to 1 when omitted.
     */
    sides?: number;
    description?: string;
    instructions?: string[];
    image?: string; // URL or path
    targetAreas?: string[];
    cues?: string[];
    benefits?: string[];
    commonMistakes?: string[];
    regression?: string;
    progression?: string;
    equipment?: string[];
}

export interface StretchingProgram {
    id: string;
    name: string;
    stretches: Stretch[];
    focusAreas?: string[];
    bestFor?: string[];
    difficulty?: "Easy" | "Moderate" | "Focused";
    equipment?: string[];
}

export interface DayRoutine {
    id: string;
    dayNumber: number;
    title: string;
    name: string; // e.g., "Heavy Push"
    exercises: Exercise[];
    stretchingProgramId?: string; // Legacy / Fallback
    preWorkoutStretchId?: string;
    postWorkoutStretchId?: string;
    primerId?: string;
    finisherId?: string;
}

export type WorkoutTemplate = DayRoutine[];

// How we'll save the user's progress for a set
export interface SavedSetState {
    completed: boolean;
    loggedWeight: string;
    loggedReps: string;
    rpe?: number;          // Rate of Perceived Exertion (1-10)
    setType?: SetType;     // Intent of the set
    completedAt?: number;  // UNIX timestamp when the checkmark was hit
}

// Flat structure per day: dayId -> exerciseId -> setId -> SavedSetState
export type WorkoutProgress = Record<string, Record<string, Record<string, SavedSetState>>>;

// ─── Session History ───────────────────────────────────────────────────────
export interface SessionSet {
    setId: string;
    targetReps: string;    // Snapshotted target (e.g., "8-12")
    loggedWeight: string;
    loggedReps: string;
    completed?: boolean;
    completedAt?: number;  // UNIX timestamp when completed
    rpe?: number;
    setType?: SetType;
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
    bodyWeightSnapshot?: number; // Freezes BW for historical pull-up/dip math
    totalTonnage?: number;       // Pre-calculated for fast charts
    exercises: SessionExercise[];
    duration?: number; // seconds
}

export type SessionHistory = WorkoutSession[];

// ─── Body Weight ───────────────────────────────────────────────────────────
export interface BodyWeightEntry {
    date: string; // YYYY-MM-DD
    weight: number;
}

export interface WorkoutSettings {
    strengthRestDuration: number;
    hypertrophyRestDuration: number;
    soundEnabled: boolean;
    weightUnit: WeightUnit;
}

export interface AppDataSnapshot {
    workoutTemplate: WorkoutTemplate;
    progress: WorkoutProgress;
    sessions: SessionHistory;
    bodyWeightEntries: BodyWeightEntry[];
    exerciseNotes: Record<string, string>;
    settings: WorkoutSettings;
    customExercises: ExerciseWiki[];
}
