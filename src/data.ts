import type {
    DayRoutine,
    Exercise,
    ExerciseLinkType,
    ExerciseType,
    SavedSetState,
    SetData,
    WorkoutProgress,
    WorkoutTemplate,
} from "./types";

const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createTemplateSet = (id: string, targetReps: string): SetData => ({
    id,
    targetReps,
    completed: false,
    loggedWeight: "",
    loggedReps: "",
});

const makeSets = (count: number, targetReps: string): SetData[] => {
    return Array.from({ length: count }, (_, i) => createTemplateSet(`set-${i + 1}`, targetReps));
};

const makeExercise = (
    id: string,
    name: string,
    setsCount: number,
    targetReps: string,
    type: ExerciseType = "hypertrophy"
): Exercise => ({
    id,
    name,
    type,
    sets: makeSets(setsCount, targetReps),
});

const DEFAULT_WORKOUT_TEMPLATE: WorkoutTemplate = [
    {
        id: "day-1",
        dayNumber: 1,
        title: "Day 1",
        name: "Heavy Push",
        stretchingProgramId: "post-workout-push",
        preWorkoutStretchId: "pre-workout-push",
        postWorkoutStretchId: "post-workout-push",
        exercises: [
            makeExercise("d1-e1", "Bench Press", 4, "6-8", "strength"),
            makeExercise("d1-e2", "Seated DB Press", 3, "8-10", "hypertrophy"),
            makeExercise("d1-e3", "Incline DB Press", 3, "8-12", "hypertrophy"),
            makeExercise("d1-e4", "Cable Lateral Raises", 4, "12-15", "hypertrophy"),
            makeExercise("d1-e5", "Tricep Pushdowns", 3, "10-12", "hypertrophy"),
        ],
    },
    {
        id: "day-2",
        dayNumber: 2,
        title: "Day 2",
        name: "Heavy Pull",
        stretchingProgramId: "post-workout-pull",
        preWorkoutStretchId: "pre-workout-pull",
        postWorkoutStretchId: "post-workout-pull",
        exercises: [
            makeExercise("d2-e1", "Barbell Rows", 4, "6-8", "strength"),
            makeExercise("d2-e2", "Pull-ups", 3, "8-10", "hypertrophy"),
            makeExercise("d2-e3", "Seated Cable Rows", 3, "10-12", "hypertrophy"),
            makeExercise("d2-e4", "Face Pulls", 3, "15", "hypertrophy"),
            makeExercise("d2-e5", "EZ-Bar Curls", 3, "8-10", "hypertrophy"),
            makeExercise("d2-e6", "Hammer Curls", 3, "10-12", "hypertrophy"),
        ],
    },
    {
        id: "day-3",
        dayNumber: 3,
        title: "Day 3",
        name: "Heavy Legs",
        stretchingProgramId: "post-workout-legs",
        preWorkoutStretchId: "pre-workout-legs",
        postWorkoutStretchId: "post-workout-legs",
        exercises: [
            makeExercise("d3-e1", "Barbell Squats", 4, "6-8", "strength"),
            makeExercise("d3-e2", "RDLs", 3, "8-10", "hypertrophy"),
            makeExercise("d3-e3", "Leg Press", 3, "10-12", "hypertrophy"),
            makeExercise("d3-e4", "Lying Leg Curls", 3, "10-12", "hypertrophy"),
            makeExercise("d3-e5", "Calf Raises", 4, "15-20", "hypertrophy"),
        ],
    },
    {
        id: "day-4",
        dayNumber: 4,
        title: "Day 4",
        name: "Hyper Push",
        stretchingProgramId: "post-workout-push",
        preWorkoutStretchId: "pre-workout-push",
        postWorkoutStretchId: "post-workout-push",
        exercises: [
            makeExercise("d4-e1", "Incline Barbell Press", 3, "8-10", "hypertrophy"),
            makeExercise("d4-e2", "Pec Deck", 3, "12-15", "hypertrophy"),
            makeExercise("d4-e3", "Arnold Press", 3, "10-12", "hypertrophy"),
            makeExercise("d4-e4", "Lateral Raises", 4, "15", "hypertrophy"),
            makeExercise("d4-e5", "Skullcrushers", 3, "10-12", "hypertrophy"),
        ],
    },
    {
        id: "day-5",
        dayNumber: 5,
        title: "Day 5",
        name: "Hyper Pull",
        stretchingProgramId: "post-workout-pull",
        preWorkoutStretchId: "pre-workout-pull",
        postWorkoutStretchId: "post-workout-pull",
        exercises: [
            makeExercise("d5-e1", "Single-Arm Rows", 3, "10-12", "hypertrophy"),
            makeExercise("d5-e2", "Close-Grip Pulldowns", 3, "10-12", "hypertrophy"),
            makeExercise("d5-e3", "Straight-Arm Pulldowns", 3, "12-15", "hypertrophy"),
            makeExercise("d5-e4", "Reverse Pec Deck", 3, "15", "hypertrophy"),
            makeExercise("d5-e5", "Preacher Curls", 3, "10-12", "hypertrophy"),
        ],
    },
    {
        id: "day-6",
        dayNumber: 6,
        title: "Day 6",
        name: "Hyper Legs",
        stretchingProgramId: "post-workout-legs",
        preWorkoutStretchId: "pre-workout-legs",
        postWorkoutStretchId: "post-workout-legs",
        exercises: [
            makeExercise("d6-e1", "Hack Squats", 3, "8-12", "hypertrophy"),
            makeExercise("d6-e2", "Leg Extensions", 3, "12-15", "hypertrophy"),
            makeExercise("d6-e3", "Seated Leg Curls", 3, "12-15", "hypertrophy"),
            makeExercise("d6-e4", "Walking Lunges", 3, "12/leg", "hypertrophy"),
            makeExercise("d6-e5", "Calf Raises", 3, "15-20", "hypertrophy"),
        ],
    },
    {
        id: "day-7",
        dayNumber: 7,
        title: "Day 7",
        name: "Active Recovery",
        stretchingProgramId: "full-body-stretch",
        exercises: [
            {
                id: "d7-e1",
                name: "Treadmill Incline Walk",
                type: "other",
                details: "45 mins",
                sets: [
                    {
                        id: "set-1",
                        targetReps: "1",
                        completed: false,
                        loggedWeight: "",
                        loggedReps: "",
                    },
                ],
            },
            {
                id: "d7-e2",
                name: "Mobility Work",
                type: "other",
                details: "15 mins",
                sets: [
                    {
                        id: "set-1",
                        targetReps: "1",
                        completed: false,
                        loggedWeight: "",
                        loggedReps: "",
                    },
                ],
            },
        ],
    },
];

export const cloneWorkoutTemplate = (template: WorkoutTemplate): WorkoutTemplate => cloneData(template);

export const createDefaultWorkoutTemplate = (): WorkoutTemplate => cloneWorkoutTemplate(DEFAULT_WORKOUT_TEMPLATE);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const normalizeExerciseType = (value: unknown): ExerciseType =>
    value === "strength" || value === "hypertrophy" || value === "other"
        ? value
        : "hypertrophy";

const normalizeExerciseLinkType = (value: unknown): ExerciseLinkType | undefined =>
    value === "superset" || value === "circuit" ? value : undefined;

export const sanitizeExerciseLinks = (exercises: Exercise[]): Exercise[] => {
    const sanitized = exercises.map((exercise) => ({ ...exercise }));

    sanitized.forEach((exercise, index) => {
        if (index >= sanitized.length - 1) {
            exercise.linkToNext = undefined;
            return;
        }

        const previousLink = index > 0 ? sanitized[index - 1].linkToNext : undefined;
        if (previousLink && exercise.linkToNext && previousLink !== exercise.linkToNext) {
            exercise.linkToNext = undefined;
        }
    });

    return sanitized;
};

const normalizeSavedSetState = (value: unknown): SavedSetState | null => {
    if (!isRecord(value)) return null;
    const result: SavedSetState = {
        completed: !!value.completed,
        loggedWeight: typeof value.loggedWeight === "string" ? value.loggedWeight : "",
        loggedReps: typeof value.loggedReps === "string" ? value.loggedReps : "",
    };
    if (typeof value.rpe === "number" && Number.isFinite(value.rpe)) {
        const r = Math.round(value.rpe);
        if (r >= 1 && r <= 10) result.rpe = r;
    }
    const st = value.setType;
    if (
        st === "warmup" ||
        st === "working" ||
        st === "drop" ||
        st === "failure"
    ) {
        result.setType = st;
    }
    return result;
};

export const normalizeWorkoutTemplate = (value: unknown): WorkoutTemplate | null => {
    if (!Array.isArray(value) || value.length === 0) return null;

    const normalized = value.flatMap((dayValue, dayIndex) => {
        if (!isRecord(dayValue)) return [];

        const dayNumber =
            typeof dayValue.dayNumber === "number" && Number.isFinite(dayValue.dayNumber)
                ? dayValue.dayNumber
                : dayIndex + 1;
        const title =
            typeof dayValue.title === "string" && dayValue.title.trim()
                ? dayValue.title.trim()
                : `Day ${dayNumber}`;
        const name =
            typeof dayValue.name === "string" && dayValue.name.trim()
                ? dayValue.name.trim()
                : title;
        const exercisesValue = Array.isArray(dayValue.exercises) ? dayValue.exercises : [];
        const exercises = sanitizeExerciseLinks(
            exercisesValue.flatMap((exerciseValue, exerciseIndex) => {
            if (!isRecord(exerciseValue)) return [];

            const type = normalizeExerciseType(exerciseValue.type);
            const setsValue = Array.isArray(exerciseValue.sets) ? exerciseValue.sets : [];
            const defaultTargetReps = type === "other" ? "1" : "8-12";
            const sets = setsValue.length
                ? setsValue.flatMap((setValue, setIndex) => {
                      if (!isRecord(setValue)) return [];
                      const id =
                          typeof setValue.id === "string" && setValue.id.trim()
                              ? setValue.id.trim()
                              : `set-${setIndex + 1}`;
                      return [
                          createTemplateSet(
                              id,
                              typeof setValue.targetReps === "string" && setValue.targetReps.trim()
                                  ? setValue.targetReps.trim()
                                  : defaultTargetReps
                          ),
                      ];
                  })
                : [createTemplateSet("set-1", defaultTargetReps)];

            return [
                {
                    id:
                        typeof exerciseValue.id === "string" && exerciseValue.id.trim()
                            ? exerciseValue.id.trim()
                            : `day-${dayNumber}-exercise-${exerciseIndex + 1}`,
                    name:
                        typeof exerciseValue.name === "string" && exerciseValue.name.trim()
                            ? exerciseValue.name.trim()
                            : `Exercise ${exerciseIndex + 1}`,
                    type,
                    details:
                        typeof exerciseValue.details === "string" && exerciseValue.details.trim()
                            ? exerciseValue.details.trim()
                            : undefined,
                    linkToNext: normalizeExerciseLinkType(exerciseValue.linkToNext),
                    sets,
                } satisfies Exercise,
            ];
            })
        );

        if (exercises.length === 0) {
            exercises.push({
                id: `day-${dayNumber}-exercise-1`,
                name: "New Exercise",
                type: "hypertrophy",
                details: undefined,
                linkToNext: undefined,
                sets: [createTemplateSet("set-1", "8-12")],
            });
        }

        return [
            {
                id:
                    typeof dayValue.id === "string" && dayValue.id.trim()
                        ? dayValue.id.trim()
                        : `day-${dayNumber}`,
                dayNumber,
                title,
                name,
                stretchingProgramId:
                    typeof dayValue.stretchingProgramId === "string" && dayValue.stretchingProgramId.trim()
                        ? dayValue.stretchingProgramId.trim()
                        : undefined,
                preWorkoutStretchId:
                    typeof dayValue.preWorkoutStretchId === "string" && dayValue.preWorkoutStretchId.trim()
                        ? dayValue.preWorkoutStretchId.trim()
                        : undefined,
                postWorkoutStretchId:
                    typeof dayValue.postWorkoutStretchId === "string" && dayValue.postWorkoutStretchId.trim()
                        ? dayValue.postWorkoutStretchId.trim()
                        : undefined,
                exercises,
            } satisfies DayRoutine,
        ];
    });

    return normalized.length > 0 ? normalized : null;
};

export const isTrainingDay = (day: DayRoutine): boolean =>
    day.exercises.some((exercise) => exercise.type !== "other");

export const pruneProgressForWorkoutTemplate = (
    progress: WorkoutProgress,
    workoutTemplate: WorkoutTemplate
): WorkoutProgress => {
    const pruned: WorkoutProgress = {};

    workoutTemplate.forEach((day) => {
        const dayProgress = progress[day.id];
        if (!dayProgress) return;

        day.exercises.forEach((exercise) => {
            const exerciseProgress = dayProgress[exercise.id];
            if (!exerciseProgress) return;

            exercise.sets.forEach((set) => {
                const savedState = normalizeSavedSetState(exerciseProgress[set.id]);
                if (!savedState) return;

                pruned[day.id] = pruned[day.id] ?? {};
                pruned[day.id][exercise.id] = pruned[day.id][exercise.id] ?? {};
                pruned[day.id][exercise.id][set.id] = savedState;
            });
        });
    });

    return pruned;
};

export const pruneExerciseNotesForWorkoutTemplate = (
    notes: Record<string, string>,
    workoutTemplate: WorkoutTemplate
): Record<string, string> => {
    const validExerciseIds = new Set(
        workoutTemplate.flatMap((day) => day.exercises.map((exercise) => exercise.id))
    );

    return Object.fromEntries(
        Object.entries(notes).filter(([exerciseId]) => validExerciseIds.has(exerciseId))
    );
};
