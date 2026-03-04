import type { DayRoutine, Exercise, SetData } from "./types";

const makeSets = (count: number, targetReps: string): SetData[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `set-${i + 1}`,
        targetReps,
        completed: false,
        loggedWeight: "",
        loggedReps: "",
    }));
};

const makeExercise = (
    id: string,
    name: string,
    setsCount: number,
    targetReps: string,
    type: "strength" | "hypertrophy" | "other" = "hypertrophy"
): Exercise => ({
    id,
    name,
    type,
    sets: makeSets(setsCount, targetReps),
});

export const WorkoutTemplate: DayRoutine[] = [
    {
        id: "day-1",
        dayNumber: 1,
        title: "Day 1",
        name: "Heavy Push",
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
