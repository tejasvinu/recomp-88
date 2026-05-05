import type { ExerciseType, ExerciseWiki } from "./types";
import { findWikiEntry, WIKI_DATA } from "./wikiData";

export const getExerciseLibraryNames = (
    customExercises: ExerciseWiki[] = []
): string[] => {
    const names = new Set<string>();

    [...WIKI_DATA, ...customExercises].forEach((entry) => {
        names.add(entry.name);
        entry.alternatives.forEach((alternative) => names.add(alternative));
    });

    return Array.from(names).sort((left, right) => left.localeCompare(right));
};

export const findExerciseLibraryEntry = (
    exerciseName: string,
    customExercises: ExerciseWiki[] = []
): ExerciseWiki | undefined =>
    findWikiEntry(exerciseName) ||
    customExercises.find(
        (entry) => entry.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );

export const inferExerciseTypeFromLibraryEntry = (
    entry: ExerciseWiki | undefined,
    fallback: ExerciseType = "hypertrophy"
): ExerciseType => (entry?.category === "Cardio/Mobility" ? "other" : fallback);
