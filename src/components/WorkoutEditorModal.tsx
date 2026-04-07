'use client';

import { useState } from "react";
import { ArrowLeftRight, Plus, Save, Trash2, X } from "lucide-react";
import { cloneWorkoutTemplate, createTemplateSet, sanitizeExerciseLinks } from "../data";
import { useModalEscape } from "../hooks/useModalEscape";
import { StretchingPrograms } from "../stretchingData";
import {
  ExerciseWiki,
  Exercise,
    ExerciseLinkType,
  ExerciseType,
  WorkoutTemplate,
} from "../types";
import { cn } from "../utils";
import {
    getFreeWeightAlternatives,
    isHomeGymFriendly,
    WIKI_DATA,
    findWikiEntry,
} from "../wikiData";


interface WorkoutEditorModalProps {
    workoutTemplate: WorkoutTemplate;
    customExercises: ExerciseWiki[];
    onSave: (workoutTemplate: WorkoutTemplate) => void;
    onSaveCustomExercise: (exercise: ExerciseWiki) => void;
    onClose: () => void;
}

const EXERCISE_TYPES: Array<{ value: ExerciseType; label: string }> = [
    { value: "strength", label: "Strength" },
    { value: "hypertrophy", label: "Hypertrophy" },
    { value: "other", label: "Other" },
];

type ExerciseCategory = ExerciseWiki["category"];

const DEFAULT_OTHER_EXERCISE_DETAILS: Record<string, string> = {
    "Treadmill Incline Walk": "45 mins",
    "Mobility Work": "15 mins",
};

const makeId = (prefix: string) => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);

const inferExerciseCategory = (
    dayName: string,
    exerciseType: ExerciseType
): ExerciseCategory | null => {
    if (exerciseType === "other") return "Cardio/Mobility";

    const normalizedDayName = dayName.toLowerCase();
    if (normalizedDayName.includes("push")) return "Push";
    if (normalizedDayName.includes("pull")) return "Pull";
    if (normalizedDayName.includes("leg")) return "Legs";

    return null;
};

const getExerciseLibraryNames = (
    category: ExerciseCategory | null,
    exerciseType: ExerciseType,
    customExercises: ExerciseWiki[] = []
) => {
    const allEntries = [...WIKI_DATA, ...customExercises];
    const relevantEntries = category
        ? allEntries.filter((entry) => entry.category === category)
        : allEntries.filter((entry) =>
              exerciseType === "other"
                  ? entry.category === "Cardio/Mobility"
                  : entry.category !== "Cardio/Mobility"
          );


    const names = new Set<string>();
    relevantEntries.forEach((entry) => {
        names.add(entry.name);
        entry.alternatives.forEach((alternative) => names.add(alternative));
    });

    return Array.from(names).sort((left, right) => left.localeCompare(right));
};

const getExerciseSwapOptions = (exercise: Exercise, dayName: string, customExercises: ExerciseWiki[] = []) => {
    const allCustom = customExercises;
    const currentEntry = findWikiEntry(exercise.name) || allCustom.find(ex => ex.name === exercise.name);
    const category =
        currentEntry?.category ?? inferExerciseCategory(dayName, exercise.type);
    const libraryNames = getExerciseLibraryNames(category, exercise.type, allCustom).filter(
        (name) => name !== exercise.name
    );
    const featuredNames = (
        currentEntry && "alternatives" in currentEntry
            ? getFreeWeightAlternatives(currentEntry)
            : libraryNames
    )

        .filter((name, index, allNames) => name !== exercise.name && allNames.indexOf(name) === index)
        .slice(0, 4);

    return {
        category,
        currentEntry,
        featuredNames,
        libraryNames,
    };
};

export default function WorkoutEditorModal({
    workoutTemplate,
    customExercises,
    onSave,
    onSaveCustomExercise,
    onClose,
}: WorkoutEditorModalProps) {
    const [draft, setDraft] = useState<WorkoutTemplate>(() => cloneWorkoutTemplate(workoutTemplate));
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    useModalEscape(onClose);

    const activeDay = draft[selectedDayIndex];

    const updateDay = (updater: (currentDay: WorkoutTemplate[number]) => WorkoutTemplate[number]) => {
        setDraft((currentDraft) =>
            currentDraft.map((day, index) => (index === selectedDayIndex ? updater(day) : day))
        );
    };

    const updateExercise = (
        exerciseId: string,
        updater: (exercise: Exercise) => Exercise
    ) => {
        updateDay((day) => ({
            ...day,
            exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId ? updater(exercise) : exercise
            ),
        }));
    };

    const addExercise = () => {
        if (!activeDay) return;

        updateDay((day) => ({
            ...day,
            exercises: sanitizeExerciseLinks([
                ...day.exercises,
                {
                    id: makeId(`${day.id}-exercise`),
                    name: `Exercise ${day.exercises.length + 1}`,
                    type: "hypertrophy",
                    sets: [createTemplateSet(makeId("set"), "8-12")],
                },
            ]),
        }));
    };

    const removeExercise = (exerciseId: string) => {
        updateDay((day) => {
            if (day.exercises.length === 1) return day;

            return {
                ...day,
                exercises: sanitizeExerciseLinks(
                    day.exercises.filter((exercise) => exercise.id !== exerciseId)
                ),
            };
        });
    };

    const setExerciseLink = (exerciseIndex: number, linkToNext?: ExerciseLinkType) => {
        updateDay((day) => {
            if (exerciseIndex < 0 || exerciseIndex >= day.exercises.length - 1) return day;

            const nextExercises = day.exercises.map((exercise, index) => {
                if (index === exerciseIndex) {
                    return { ...exercise, linkToNext };
                }

                if (
                    linkToNext &&
                    (index === exerciseIndex - 1 || index === exerciseIndex + 1) &&
                    exercise.linkToNext &&
                    exercise.linkToNext !== linkToNext
                ) {
                    return { ...exercise, linkToNext: undefined };
                }

                return { ...exercise };
            });

            return {
                ...day,
                exercises: sanitizeExerciseLinks(nextExercises),
            };
        });
    };

    const addSet = (exerciseId: string, type: ExerciseType) => {
        updateExercise(exerciseId, (exercise) => ({
            ...exercise,
            sets: [
                ...exercise.sets,
                createTemplateSet(makeId("set"), type === "other" ? "1" : "8-12"),
            ],
        }));
    };

    const removeSet = (exerciseId: string, setId: string) => {
        updateExercise(exerciseId, (exercise) => {
            if (exercise.sets.length === 1) return exercise;

            return {
                ...exercise,
                sets: exercise.sets.filter((set) => set.id !== setId),
            };
        });
    };

    const swapExercise = (exerciseId: string, nextExerciseName: string) => {
        if (!nextExerciseName) return;

        updateExercise(exerciseId, (currentExercise) => {
            if (currentExercise.name === nextExerciseName) return currentExercise;

            return {
                ...currentExercise,
                id: makeId(
                    `${activeDay.id}-${slugify(nextExerciseName) || "exercise"}`
                ),
                name: nextExerciseName,
                details:
                    currentExercise.type === "other"
                        ? DEFAULT_OTHER_EXERCISE_DETAILS[nextExerciseName] ??
                          currentExercise.details
                        : undefined,
            };
        });
    };

    if (!activeDay) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-editor-title"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <div
                className="relative z-10 w-full max-w-3xl bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-3xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-white/6 px-5 pt-5 pb-4">
                    <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] text-lime-400 font-black uppercase tracking-[0.2em] mb-2">
                                Configurable Program
                            </p>
                            <h2
                                id="workout-editor-title"
                                className="text-[18px] font-black text-white tracking-wide"
                            >
                                Edit Workout Template
                            </h2>
                            <p className="text-[11px] text-neutral-500 font-medium mt-1.5 max-w-lg">
                                Update the shipped routine, keep your custom version in sync, and
                                reset back to the default plan any time from settings.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/7 shrink-0"
                            aria-label="Close workout editor"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[78vh] overscroll-contain">
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3">
                            Days
                        </p>
                        <div className="flex gap-2 overflow-x-auto scrollbar-none">
                            {draft.map((day, index) => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => setSelectedDayIndex(index)}
                                    className={cn(
                                        "shrink-0 px-3.5 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all",
                                        selectedDayIndex === index
                                            ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                                            : "bg-white/4 border-white/7 text-neutral-500 hover:bg-white/7 hover:text-neutral-300"
                                    )}
                                >
                                    D{day.dayNumber}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/3 border border-white/7 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Day Details
                                </p>
                                <p className="text-[13px] text-white font-bold mt-1">
                                    Day {activeDay.dayNumber}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Title
                                </span>
                                <input
                                    value={activeDay.title}
                                    onChange={(event) =>
                                        updateDay((day) => ({
                                            ...day,
                                            title: event.target.value,
                                        }))
                                    }
                                    className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                    placeholder="Day 1"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Focus Name
                                </span>
                                <input
                                    value={activeDay.name}
                                    onChange={(event) =>
                                        updateDay((day) => ({
                                            ...day,
                                            name: event.target.value,
                                        }))
                                    }
                                    className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                    placeholder="Heavy Push"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5 md:col-span-1">
                                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Pre-Workout Protocol
                                </span>
                                <select
                                    value={activeDay.preWorkoutStretchId ?? ""}
                                    onChange={(event) =>
                                        updateDay((day) => ({
                                            ...day,
                                            preWorkoutStretchId:
                                                event.target.value || undefined,
                                        }))
                                    }
                                    className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                >
                                    <option value="">None</option>
                                    {StretchingPrograms.map((program) => (
                                        <option key={program.id} value={program.id}>
                                            {program.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1.5 md:col-span-1">
                                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Post-Workout Protocol
                                </span>
                                <select
                                    value={activeDay.postWorkoutStretchId ?? activeDay.stretchingProgramId ?? ""}
                                    onChange={(event) =>
                                        updateDay((day) => ({
                                            ...day,
                                            postWorkoutStretchId:
                                                event.target.value || undefined,
                                            stretchingProgramId: undefined, // Clear legacy prop on change
                                        }))
                                    }
                                    className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                >
                                    <option value="">None</option>
                                    {StretchingPrograms.map((program) => (
                                        <option key={program.id} value={program.id}>
                                            {program.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div>
                                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                    Exercises
                                </p>
                                <p className="text-[11px] text-neutral-600 font-medium mt-1">
                                    Manual edits keep the slot stable. Quick swaps create a fresh
                                    exercise slot so notes, PRs, and set history do not mix across
                                    different movements.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addExercise}
                                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-400/12 border border-lime-400/25 text-lime-400 text-[11px] font-black uppercase tracking-widest hover:bg-lime-400/20 transition-all"
                            >
                                <Plus size={13} />
                                Add Exercise
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {activeDay.exercises.map((exercise, exerciseIndex) => {
                                const swapOptions = getExerciseSwapOptions(
                                    exercise,
                                    activeDay.name,
                                    customExercises
                                );
                                const previousLink = exerciseIndex > 0
                                    ? activeDay.exercises[exerciseIndex - 1]?.linkToNext
                                    : undefined;
                                const currentLinkType = previousLink ?? exercise.linkToNext;
                                const nextExercise = activeDay.exercises[exerciseIndex + 1];

                                return (
                                    <div key={exercise.id} className="flex flex-col gap-3">
                                        <div className="bg-white/3 border border-white/7 rounded-2xl p-4">
                                            <div className="flex items-center justify-between gap-4 mb-4">
                                                <div>
                                                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                        Exercise {exerciseIndex + 1}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <p className="text-[12px] text-neutral-300 font-medium">
                                                            {exercise.id}
                                                        </p>
                                                        {currentLinkType && (
                                                            <span
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.16em]",
                                                                    currentLinkType === "superset"
                                                                        ? "border-lime-400/20 bg-lime-400/10 text-lime-400"
                                                                        : "border-sky-400/20 bg-sky-400/10 text-sky-400"
                                                                )}
                                                            >
                                                                {currentLinkType}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeExercise(exercise.id)}
                                                    disabled={activeDay.exercises.length === 1}
                                                    className={cn(
                                                        "w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                                                        activeDay.exercises.length === 1
                                                            ? "bg-white/4 border-white/6 text-neutral-700 cursor-not-allowed"
                                                            : "bg-red-400/8 border-red-400/20 text-red-400 hover:bg-red-400/14"
                                                    )}
                                                    aria-label={`Remove ${exercise.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_180px] gap-3">
                                                <label className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                            Exercise Name
                                                        </span>
                                                        {exercise.name && !findWikiEntry(exercise.name) && !customExercises.find(ex => ex.name === exercise.name) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onSaveCustomExercise({
                                                                    id: makeId('custom'),
                                                                    name: exercise.name,
                                                                    category: swapOptions.category || 'Push',
                                                                    muscles: { primary: [], secondary: [] },
                                                                    biomechanics: 'User-defined custom exercise.',
                                                                    cues: [],
                                                                    commonMistakes: [],
                                                                    alternatives: [],
                                                                    notes: '',
                                                                })}
                                                                className="text-[9px] text-lime-400 font-black uppercase tracking-widest hover:text-lime-300 transition-colors"
                                                            >
                                                                + Save to Library
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input
                                                        value={exercise.name}
                                                        onChange={(event) =>
                                                            updateExercise(exercise.id, (currentExercise) => ({
                                                                ...currentExercise,
                                                                name: event.target.value,
                                                            }))
                                                        }
                                                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                                        placeholder="Bench Press"
                                                    />
                                                </label>

                                                <label className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                        Type
                                                    </span>
                                                    <select
                                                        value={exercise.type}
                                                        onChange={(event) =>
                                                            updateExercise(exercise.id, (currentExercise) => ({
                                                                ...currentExercise,
                                                                type: event.target.value as ExerciseType,
                                                            }))
                                                        }
                                                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                                    >
                                                        {EXERCISE_TYPES.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            <div className="mt-3 rounded-2xl border border-lime-400/10 bg-[linear-gradient(135deg,rgba(163,230,53,0.07),rgba(255,255,255,0.03))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                                                        <ArrowLeftRight size={15} className="text-lime-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white">
                                                                Alternative Swaps
                                                            </p>
                                                            {swapOptions.category && (
                                                                <span className="px-2 py-0.5 rounded-full border border-lime-400/20 bg-lime-400/10 text-[9px] font-black uppercase tracking-[0.16em] text-lime-400">
                                                                    {swapOptions.category}
                                                                </span>
                                                            )}
                                                            {swapOptions.currentEntry &&
                                                                isHomeGymFriendly(swapOptions.currentEntry) && (
                                                                    <span className="px-2 py-0.5 rounded-full border border-sky-400/20 bg-sky-400/10 text-[9px] font-black uppercase tracking-[0.16em] text-sky-400">
                                                                        Home Gym Friendly
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <p className="text-[10px] text-neutral-500 font-medium mt-1.5 leading-relaxed">
                                                            Quick picks now prioritize free-weight and
                                                            low-access alternatives so the program still
                                                            works when cables or machines are missing.
                                                        </p>
                                                    </div>
                                                </div>

                                                {swapOptions.featuredNames.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {swapOptions.featuredNames.map((alternativeName) => (
                                                            <button
                                                                key={alternativeName}
                                                                type="button"
                                                                onClick={() =>
                                                                    swapExercise(
                                                                        exercise.id,
                                                                        alternativeName
                                                                    )
                                                                }
                                                                className="px-3 py-1.5 rounded-xl bg-black/25 border border-white/8 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-200 hover:border-lime-400/25 hover:bg-lime-400/10 hover:text-lime-400 transition-all"
                                                            >
                                                                {alternativeName}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <label className="flex flex-col gap-1.5 mt-3">
                                                    <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                        Exercise Library
                                                    </span>
                                                    <select
                                                        defaultValue=""
                                                        onChange={(event) => {
                                                            const nextExerciseName = event.target.value;
                                                            if (nextExerciseName) {
                                                                swapExercise(
                                                                    exercise.id,
                                                                    nextExerciseName
                                                                );
                                                                event.target.value = "";
                                                            }
                                                        }}
                                                        className="bg-black/25 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                                    >
                                                        <option value="">
                                                            Choose a compatible alternative...
                                                        </option>
                                                        {swapOptions.libraryNames.map((libraryName) => (
                                                            <option
                                                                key={libraryName}
                                                                value={libraryName}
                                                            >
                                                                {libraryName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            <label className="flex flex-col gap-1.5 mt-3">
                                                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                    Details
                                                </span>
                                                <input
                                                    value={exercise.details ?? ""}
                                                    onChange={(event) =>
                                                        updateExercise(exercise.id, (currentExercise) => ({
                                                            ...currentExercise,
                                                            details: event.target.value || undefined,
                                                        }))
                                                    }
                                                    className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-semibold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                                    placeholder={
                                                        exercise.type === "other"
                                                            ? "45 mins, incline walk, mobility block..."
                                                            : "Optional cues or equipment notes"
                                                    }
                                                />
                                            </label>

                                            <div className="mt-4">
                                                <div className="flex items-center justify-between gap-4 mb-2.5">
                                                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                        Sets
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={() => addSet(exercise.id, exercise.type)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px] font-black uppercase tracking-widest text-neutral-300 hover:bg-white/8 transition-all"
                                                    >
                                                        <Plus size={11} />
                                                        Add Set
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {exercise.sets.map((set, setIndex) => (
                                                        <div
                                                            key={set.id}
                                                            className="grid grid-cols-[auto_1fr_auto] gap-2 items-center bg-black/20 border border-white/6 rounded-xl px-3 py-2.5"
                                                        >
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                                                Set {setIndex + 1}
                                                            </span>

                                                            <input
                                                                value={set.targetReps}
                                                                onChange={(event) =>
                                                                    updateExercise(exercise.id, (currentExercise) => ({
                                                                        ...currentExercise,
                                                                        sets: currentExercise.sets.map((currentSet) =>
                                                                            currentSet.id === set.id
                                                                                ? {
                                                                                      ...currentSet,
                                                                                      targetReps:
                                                                                          event.target.value,
                                                                                  }
                                                                                : currentSet
                                                                        ),
                                                                    }))
                                                                }
                                                                className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm font-semibold text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/30 focus:border-lime-400/20 transition-all"
                                                                placeholder="6-8"
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() => removeSet(exercise.id, set.id)}
                                                                disabled={exercise.sets.length === 1}
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                                                                    exercise.sets.length === 1
                                                                        ? "bg-white/4 border-white/6 text-neutral-700 cursor-not-allowed"
                                                                        : "bg-red-400/8 border-red-400/20 text-red-400 hover:bg-red-400/14"
                                                                )}
                                                                aria-label={`Remove set ${setIndex + 1}`}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {nextExercise && (
                                            <div className="relative px-2">
                                                <div className="absolute left-6 top-0 bottom-0 w-px bg-white/6" />
                                                <div className="relative ml-10 rounded-2xl border border-white/7 bg-black/20 px-3.5 py-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                                                                Link to Next Exercise
                                                            </p>
                                                            <p className="text-[11px] text-neutral-300 font-medium mt-1">
                                                                {exercise.name} → {nextExercise.name}
                                                            </p>
                                                        </div>
                                                        {exercise.linkToNext && (
                                                            <span
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.16em]",
                                                                    exercise.linkToNext === "superset"
                                                                        ? "border-lime-400/20 bg-lime-400/10 text-lime-400"
                                                                        : "border-sky-400/20 bg-sky-400/10 text-sky-400"
                                                                )}
                                                            >
                                                                {exercise.linkToNext}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExerciseLink(
                                                                    exerciseIndex,
                                                                    exercise.linkToNext === "superset"
                                                                        ? undefined
                                                                        : "superset"
                                                                )
                                                            }
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.16em] transition-all",
                                                                exercise.linkToNext === "superset"
                                                                    ? "border-lime-400/25 bg-lime-400/12 text-lime-400"
                                                                    : "border-white/8 bg-white/4 text-neutral-300 hover:border-lime-400/20 hover:bg-lime-400/10 hover:text-lime-400"
                                                            )}
                                                        >
                                                            Superset
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExerciseLink(
                                                                    exerciseIndex,
                                                                    exercise.linkToNext === "circuit"
                                                                        ? undefined
                                                                        : "circuit"
                                                                )
                                                            }
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.16em] transition-all",
                                                                exercise.linkToNext === "circuit"
                                                                    ? "border-sky-400/25 bg-sky-400/12 text-sky-400"
                                                                    : "border-white/8 bg-white/4 text-neutral-300 hover:border-sky-400/20 hover:bg-sky-400/10 hover:text-sky-400"
                                                            )}
                                                        >
                                                            Circuit
                                                        </button>
                                                        {exercise.linkToNext && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExerciseLink(exerciseIndex, undefined)}
                                                                className="px-3 py-1.5 rounded-xl border border-white/8 bg-white/3 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 hover:bg-white/6 hover:text-white transition-all"
                                                            >
                                                                Clear Link
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-neutral-500 font-medium mt-2.5 leading-relaxed">
                                                        Links stay adjacent. Matching links can chain
                                                        into longer circuits or supersets without extra setup.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/6 px-5 py-4 bg-black/20 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <p className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest">
                        Changes save locally first, then sync to the cloud when signed in.
                    </p>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-white/8 bg-white/4 text-neutral-300 text-[11px] font-black uppercase tracking-widest hover:bg-white/7 transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={() => onSave(draft)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-lime-400/25 bg-lime-400/12 text-lime-400 text-[11px] font-black uppercase tracking-widest hover:bg-lime-400/20 transition-all"
                        >
                            <Save size={13} />
                            Save Workout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
