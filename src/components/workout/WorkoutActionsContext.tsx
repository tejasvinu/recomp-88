'use client';

import { createContext, useContext } from "react";
import type { ExerciseType, SetType } from "../../types";

export type SetField = "loggedWeight" | "loggedReps" | "rpe" | "setType" | "completedAt";

/**
 * Everything the tracker UI can do to workout state. Implemented in App.tsx
 * (which owns the store, timers, toasts and sync); consumed by ExerciseCard and
 * SetRow. Layout components call these and never mutate state themselves, so
 * the tracker can be redesigned without touching workout logic.
 */
export interface WorkoutActions {
    toggleSet: (dayId: string, exerciseId: string, setId: string, restType: ExerciseType) => void;
    updateSetData: (dayId: string, exerciseId: string, setId: string, field: SetField, value: string | number | SetType | undefined) => void;
    adjustWeight: (exerciseId: string, setId: string, delta: number) => void;
    bwFill: (exerciseId: string) => void;
    loadLastSession: (exerciseId: string) => void;
    openExerciseInfo: (name: string) => void;
    openExerciseHistory?: (exerciseId: string, name?: string) => void;
    noteChange: (exerciseId: string, note: string) => void;
    addExtraSet: (dayId: string, exerciseId: string) => void;
    removeExtraSet: (dayId: string, exerciseId: string, setId: string) => void;
}

const WorkoutActionsContext = createContext<WorkoutActions | null>(null);

export const WorkoutActionsProvider = WorkoutActionsContext.Provider;

export function useWorkoutActions(): WorkoutActions {
    const actions = useContext(WorkoutActionsContext);
    if (!actions) throw new Error("useWorkoutActions must be used inside WorkoutActionsProvider");
    return actions;
}
