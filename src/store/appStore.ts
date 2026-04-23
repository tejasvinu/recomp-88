'use client';

import { create } from 'zustand';
import { createDefaultWorkoutTemplate, normalizeWorkoutTemplate } from '../data';
import { readLocalStorageValue, writeLocalStorageValue } from '../services/storageService';
import type {
    AppDataSnapshot,
    BodyWeightEntry,
    ExerciseWiki,
    SessionHistory,
    WorkoutProgress,
    WorkoutTemplate as WorkoutTemplateData,
} from '../types';

// ─── Storage keys ──────────────────────────────────────────────────────────
export const APP_STORAGE_KEYS = [
    'recomp88-workout-template',
    'recomp88-progress',
    'recomp88-sessions',
    'recomp88-strength-rest',
    'recomp88-hypertrophy-rest',
    'recomp88-notes',
    'recomp88-sound',
    'recomp88-bodyweight',
    'recomp88-weight-unit',
    'recomp88-rest-state',
    'recomp88-timer-start',
    'recomp88-timer-paused',
    'recomp88-pwa-dismissed',
    'recomp88-custom-exercises',
] as const;

export const DEFAULT_SETTINGS = {
    strengthRestDuration: 120,
    hypertrophyRestDuration: 90,
    soundEnabled: true,
    weightUnit: 'kg' as const,
};

// ─── Store shape ─────────────────────────────────────────────────────────────
export interface AppState {
    // Persisted
    workoutTemplate: WorkoutTemplateData;
    progress: WorkoutProgress;
    sessions: SessionHistory;
    strengthRestDuration: number;
    hypertrophyRestDuration: number;
    exerciseNotes: Record<string, string>;
    soundEnabled: boolean;
    bodyWeightEntries: BodyWeightEntry[];
    weightUnit: 'kg' | 'lbs';
    customExercises: ExerciseWiki[];

    // UI / ephemeral
    activeTab: 'workout' | 'stretching' | 'wiki' | 'charts' | 'profile';
    activeDayIndex: number;
    selectedStretchingProgramId: string | null;

    // Setters
    setWorkoutTemplate: (v: WorkoutTemplateData) => void;
    setProgress: (v: WorkoutProgress | ((prev: WorkoutProgress) => WorkoutProgress)) => void;
    setSessions: (v: SessionHistory | ((prev: SessionHistory) => SessionHistory)) => void;
    setStrengthRestDuration: (v: number | ((prev: number) => number)) => void;
    setHypertrophyRestDuration: (v: number | ((prev: number) => number)) => void;
    setExerciseNotes: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
    setSoundEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
    setBodyWeightEntries: (v: BodyWeightEntry[] | ((prev: BodyWeightEntry[]) => BodyWeightEntry[])) => void;
    setWeightUnit: (v: 'kg' | 'lbs' | ((prev: 'kg' | 'lbs') => 'kg' | 'lbs')) => void;
    setCustomExercises: (v: ExerciseWiki[] | ((prev: ExerciseWiki[]) => ExerciseWiki[])) => void;

    setActiveTab: (tab: AppState['activeTab']) => void;
    setActiveDayIndex: (idx: number) => void;
    setSelectedStretchingProgramId: (id: string | null) => void;

    // Bulk apply (used by cloud sync import)
    applySnapshot: (snapshot: AppDataSnapshot) => void;

    // Reset everything to factory defaults
    resetToDefaults: () => void;
}

// ─── Persisted-setter factory ────────────────────────────────────────────────
function makePersistedSetter<K extends keyof AppState>(
    set: (fn: (s: AppState) => Partial<AppState>) => void,
    get: () => AppState,
    key: K,
    storageKey: string,
) {
    return (updater: AppState[K] | ((prev: AppState[K]) => AppState[K])) => {
        const current = get()[key];
        const next = (
            typeof updater === 'function'
                ? (updater as (prev: AppState[K]) => AppState[K])(current)
                : updater
        ) as AppState[K];
        if (Object.is(next, current)) return;
        writeLocalStorageValue(storageKey, next);
        set(() => ({ [key]: next } as Partial<AppState>));
    };
}

// ─── Build the default initial values (Server-safe) ────────────────────────
const DEFAULT_TEMPLATE = createDefaultWorkoutTemplate();

// IMPORTANT: The store is created with DETERMINISTIC defaults so that the
// server snapshot and the first client render both produce the same
// `getState()` reference. This avoids React's "getServerSnapshot should be
// cached" warning (and its downstream infinite-loop / hydration errors).
// Persisted localStorage values are loaded AFTER mount via `hydrateFromStorage()`.
const SSR_SAFE_INITIAL = {
    workoutTemplate: DEFAULT_TEMPLATE,
    progress: {} as WorkoutProgress,
    sessions: [] as SessionHistory,
    strengthRestDuration: DEFAULT_SETTINGS.strengthRestDuration,
    hypertrophyRestDuration: DEFAULT_SETTINGS.hypertrophyRestDuration,
    exerciseNotes: {} as Record<string, string>,
    soundEnabled: DEFAULT_SETTINGS.soundEnabled,
    bodyWeightEntries: [] as BodyWeightEntry[],
    weightUnit: DEFAULT_SETTINGS.weightUnit,
    customExercises: [] as ExerciseWiki[],
};

const readPersistedState = () => {
    if (typeof window === 'undefined') return SSR_SAFE_INITIAL;

    const storedTemplate = readLocalStorageValue<WorkoutTemplateData>('recomp88-workout-template', DEFAULT_TEMPLATE);
    const workoutTemplate = normalizeWorkoutTemplate(storedTemplate) ?? DEFAULT_TEMPLATE;

    return {
        workoutTemplate,
        progress: readLocalStorageValue<WorkoutProgress>('recomp88-progress', {}),
        sessions: readLocalStorageValue<SessionHistory>('recomp88-sessions', []),
        strengthRestDuration: readLocalStorageValue<number>('recomp88-strength-rest', DEFAULT_SETTINGS.strengthRestDuration),
        hypertrophyRestDuration: readLocalStorageValue<number>('recomp88-hypertrophy-rest', DEFAULT_SETTINGS.hypertrophyRestDuration),
        exerciseNotes: readLocalStorageValue<Record<string, string>>('recomp88-notes', {}),
        soundEnabled: readLocalStorageValue<boolean>('recomp88-sound', DEFAULT_SETTINGS.soundEnabled),
        bodyWeightEntries: readLocalStorageValue<BodyWeightEntry[]>('recomp88-bodyweight', []),
        weightUnit: readLocalStorageValue<'kg' | 'lbs'>('recomp88-weight-unit', DEFAULT_SETTINGS.weightUnit),
        customExercises: readLocalStorageValue<ExerciseWiki[]>('recomp88-custom-exercises', []),
    };
};

/**
 * Hydrate the store from localStorage before store subscribers mount. Running
 * it during the store initializer would make the Zustand snapshot diverge
 * between SSR and the first client render.
 */
let storageHydrated = false;
export const hydrateStoreFromStorage = () => {
    if (storageHydrated || typeof window === 'undefined') return;
    storageHydrated = true;
    useAppStore.setState(readPersistedState());
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set, get) => {
    const initial = SSR_SAFE_INITIAL;

    return {
        // Persisted state
        ...initial,

        // Ephemeral state
        activeTab: 'workout',
        activeDayIndex: 0,
        selectedStretchingProgramId: null,

        // Persisted setters
        setWorkoutTemplate: makePersistedSetter(set, get, 'workoutTemplate', 'recomp88-workout-template'),
        setProgress: makePersistedSetter(set, get, 'progress', 'recomp88-progress'),
        setSessions: makePersistedSetter(set, get, 'sessions', 'recomp88-sessions'),
        setStrengthRestDuration: makePersistedSetter(set, get, 'strengthRestDuration', 'recomp88-strength-rest'),
        setHypertrophyRestDuration: makePersistedSetter(set, get, 'hypertrophyRestDuration', 'recomp88-hypertrophy-rest'),
        setExerciseNotes: makePersistedSetter(set, get, 'exerciseNotes', 'recomp88-notes'),
        setSoundEnabled: makePersistedSetter(set, get, 'soundEnabled', 'recomp88-sound'),
        setBodyWeightEntries: makePersistedSetter(set, get, 'bodyWeightEntries', 'recomp88-bodyweight'),
        setWeightUnit: makePersistedSetter(set, get, 'weightUnit', 'recomp88-weight-unit'),
        setCustomExercises: makePersistedSetter(set, get, 'customExercises', 'recomp88-custom-exercises'),

        // Ephemeral setters
        setActiveTab: (tab) => set(() => ({ activeTab: tab })),
        setActiveDayIndex: (idx) => set(() => ({ activeDayIndex: idx })),
        setSelectedStretchingProgramId: (id) => set(() => ({ selectedStretchingProgramId: id })),

        // Bulk snapshot apply (cloud pull / import)
        applySnapshot: (snapshot: AppDataSnapshot) => {
            const s = get();
            const normalizedTemplate = normalizeWorkoutTemplate(snapshot.workoutTemplate) ?? createDefaultWorkoutTemplate();

            writeLocalStorageValue('recomp88-workout-template', normalizedTemplate);
            writeLocalStorageValue('recomp88-progress', snapshot.progress);
            writeLocalStorageValue('recomp88-sessions', snapshot.sessions);
            writeLocalStorageValue('recomp88-bodyweight', snapshot.bodyWeightEntries);
            writeLocalStorageValue('recomp88-notes', snapshot.exerciseNotes);
            writeLocalStorageValue('recomp88-custom-exercises', snapshot.customExercises);
            writeLocalStorageValue('recomp88-strength-rest', snapshot.settings.strengthRestDuration);
            writeLocalStorageValue('recomp88-hypertrophy-rest', snapshot.settings.hypertrophyRestDuration);
            writeLocalStorageValue('recomp88-sound', snapshot.settings.soundEnabled);
            writeLocalStorageValue('recomp88-weight-unit', snapshot.settings.weightUnit);

            set(() => ({
                workoutTemplate: normalizedTemplate,
                progress: snapshot.progress,
                sessions: snapshot.sessions,
                bodyWeightEntries: snapshot.bodyWeightEntries,
                exerciseNotes: snapshot.exerciseNotes,
                customExercises: snapshot.customExercises,
                strengthRestDuration: snapshot.settings.strengthRestDuration,
                hypertrophyRestDuration: snapshot.settings.hypertrophyRestDuration,
                soundEnabled: snapshot.settings.soundEnabled,
                weightUnit: snapshot.settings.weightUnit,
                // Clamp day index in case the new template is shorter
                activeDayIndex: Math.min(s.activeDayIndex, Math.max(normalizedTemplate.length - 1, 0)),
            }));
        },

        // Reset to factory defaults
        resetToDefaults: () => {
            APP_STORAGE_KEYS.forEach((k) => {
                if (typeof window !== 'undefined') window.localStorage.removeItem(k);
            });
            set(() => ({
                workoutTemplate: DEFAULT_TEMPLATE,
                progress: {},
                sessions: [],
                bodyWeightEntries: [],
                customExercises: [],
                exerciseNotes: {},
                strengthRestDuration: DEFAULT_SETTINGS.strengthRestDuration,
                hypertrophyRestDuration: DEFAULT_SETTINGS.hypertrophyRestDuration,
                soundEnabled: DEFAULT_SETTINGS.soundEnabled,
                weightUnit: DEFAULT_SETTINGS.weightUnit,
                activeDayIndex: 0,
            }));
        },
    };
});

// ─── Derived selectors (Note: Use with useShallow in components) ──────────

export const selectCurrentSettings = (s: AppState) => ({
    strengthRestDuration: s.strengthRestDuration,
    hypertrophyRestDuration: s.hypertrophyRestDuration,
    soundEnabled: s.soundEnabled,
    weightUnit: s.weightUnit,
});

export const selectCurrentSnapshot = (s: AppState): AppDataSnapshot => ({
    workoutTemplate: s.workoutTemplate,
    progress: s.progress,
    sessions: s.sessions,
    bodyWeightEntries: s.bodyWeightEntries,
    exerciseNotes: s.exerciseNotes,
    settings: selectCurrentSettings(s),
    customExercises: s.customExercises,
});

/** Returns the workout template from store. It is normalized on input/init. */
export const selectSafeWorkoutTemplate = (s: AppState) => s.workoutTemplate;


