import { normalizeWorkoutTemplate } from "@/data";
import type {
  AppDataSnapshot,
  BodyWeightEntry,
  ExerciseEquipment,
  ExerciseWiki,
  SessionExercise,
  SessionHistory,
  SessionSet,
  SetType,
  WeightUnit,
  WorkoutProgress,
  WorkoutSession,
  WorkoutSettings,
} from "@/types";

export type CloudSyncSnapshot = AppDataSnapshot & {
  lastSyncedAt?: string | Date | null;
};

export type SyncPushPayload = AppDataSnapshot & {
  baseLastSyncedAt?: string | null;
};

export type SanitizedSyncPayload = {
  workoutTemplate?: AppDataSnapshot["workoutTemplate"];
  progress?: WorkoutProgress;
  sessions?: SessionHistory;
  bodyWeightEntries?: BodyWeightEntry[];
  exerciseNotes?: Record<string, string>;
  settings?: Partial<WorkoutSettings>;
  customExercises?: ExerciseWiki[];
  baseLastSyncedAt?: string | null;
  lastSyncedAt?: string | Date | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const normalized = toTrimmedString(item);
        return normalized ? [normalized] : [];
      })
    : [];

const normalizeWeightUnit = (value: unknown): WeightUnit | null =>
  value === "kg" || value === "lbs" ? value : null;

const normalizeExerciseEquipment = (value: unknown): ExerciseEquipment[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        switch (item) {
          case "barbell":
          case "dumbbell":
          case "kettlebell":
          case "bench":
          case "bodyweight":
          case "band":
          case "machine":
          case "cable":
          case "smith-machine":
          case "landmine":
          case "pull-up-bar":
            return [item];
          default:
            return [];
        }
      })
    : [];

const normalizeExerciseCategory = (
  value: unknown
): ExerciseWiki["category"] | null => {
  switch (value) {
    case "Push":
    case "Pull":
    case "Legs":
    case "Core":
    case "Cardio/Mobility":
      return value;
    default:
      return null;
  }
};

const normalizeDifficulty = (
  value: unknown
): ExerciseWiki["difficulty"] | null => {
  switch (value) {
    case "Beginner":
    case "Intermediate":
    case "Advanced":
      return value;
    default:
      return null;
  }
};

const normalizeSetType = (value: unknown): SetType | undefined => {
  switch (value) {
    case "warmup":
    case "working":
    case "drop":
    case "failure":
      return value;
    default:
      return undefined;
  }
};

const normalizeRpe = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 1 || value > 10) return undefined;
  return Math.round(value);
};

const normalizeSavedSetState = (
  value: unknown
): WorkoutProgress[string][string][string] | null => {
  if (!isRecord(value)) return null;

  const result: WorkoutProgress[string][string][string] = {
    completed: !!value.completed,
    loggedWeight: typeof value.loggedWeight === "string" ? value.loggedWeight : "",
    loggedReps: typeof value.loggedReps === "string" ? value.loggedReps : "",
  };

  const rpe = normalizeRpe(value.rpe);
  if (rpe !== undefined) result.rpe = rpe;

  const setType = normalizeSetType(value.setType);
  if (setType !== undefined) result.setType = setType;

  return result;
};

export const sanitizeWorkoutProgress = (value: unknown): WorkoutProgress => {
  if (!isRecord(value)) return {};

  const sanitized: WorkoutProgress = {};

  Object.entries(value).forEach(([dayId, exerciseMap]) => {
    if (!isRecord(exerciseMap)) return;

    const dayProgress: WorkoutProgress[string] = {};

    Object.entries(exerciseMap).forEach(([exerciseId, setMap]) => {
      if (!isRecord(setMap)) return;

      const exerciseProgress: WorkoutProgress[string][string] = {};

      Object.entries(setMap).forEach(([setId, savedState]) => {
        const normalizedState = normalizeSavedSetState(savedState);
        if (!normalizedState) return;
        exerciseProgress[setId] = normalizedState;
      });

      if (Object.keys(exerciseProgress).length > 0) {
        dayProgress[exerciseId] = exerciseProgress;
      }
    });

    if (Object.keys(dayProgress).length > 0) {
      sanitized[dayId] = dayProgress;
    }
  });

  return sanitized;
};

const sanitizeSessionSet = (value: unknown): SessionSet | null => {
  if (!isRecord(value)) return null;

  const setId = toTrimmedString(value.setId);
  if (!setId) return null;

  const result: SessionSet = {
    setId,
    loggedWeight: typeof value.loggedWeight === "string" ? value.loggedWeight : "",
    loggedReps: typeof value.loggedReps === "string" ? value.loggedReps : "",
    completed: typeof value.completed === "boolean" ? value.completed : undefined,
  };

  const rpe = normalizeRpe(value.rpe);
  if (rpe !== undefined) result.rpe = rpe;

  const setType = normalizeSetType(value.setType);
  if (setType !== undefined) result.setType = setType;

  return result;
};

const sanitizeSessionExercise = (value: unknown): SessionExercise | null => {
  if (!isRecord(value)) return null;

  const exerciseId = toTrimmedString(value.exerciseId);
  const name = toTrimmedString(value.name);
  const type =
    value.type === "strength" || value.type === "hypertrophy" || value.type === "other"
      ? value.type
      : null;
  const sets = Array.isArray(value.sets)
    ? value.sets.flatMap((setValue) => {
        const sanitizedSet = sanitizeSessionSet(setValue);
        return sanitizedSet ? [sanitizedSet] : [];
      })
    : [];

  if (!exerciseId || !name || !type || sets.length === 0) {
    return null;
  }

  return {
    exerciseId,
    name,
    type,
    sets,
  };
};

const parseSessionTime = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

export const sanitizeSessionHistory = (value: unknown): SessionHistory =>
  Array.isArray(value)
    ? value.flatMap((sessionValue) => {
        if (!isRecord(sessionValue)) return [];

        const id = toTrimmedString(sessionValue.id);
        const date = toTrimmedString(sessionValue.date);
        const dayId = toTrimmedString(sessionValue.dayId);
        const dayName = toTrimmedString(sessionValue.dayName);
        const exercises = Array.isArray(sessionValue.exercises)
          ? sessionValue.exercises.flatMap((exerciseValue) => {
              const sanitizedExercise = sanitizeSessionExercise(exerciseValue);
              return sanitizedExercise ? [sanitizedExercise] : [];
            })
          : [];

        if (!id || !date || !dayId || !dayName || exercises.length === 0) {
          return [];
        }

        const duration =
          typeof sessionValue.duration === "number" && Number.isFinite(sessionValue.duration)
            ? sessionValue.duration
            : undefined;

        return [
          {
            id,
            date,
            dayId,
            dayName,
            exercises,
            duration,
          } satisfies WorkoutSession,
        ];
      })
    : [];

export const sanitizeBodyWeightEntries = (value: unknown): BodyWeightEntry[] =>
  Array.isArray(value)
    ? value.flatMap((entryValue) => {
        if (!isRecord(entryValue)) return [];

        const date = toTrimmedString(entryValue.date);
        const weight =
          typeof entryValue.weight === "number" && Number.isFinite(entryValue.weight)
            ? entryValue.weight
            : null;

        if (!date || weight === null) return [];

        return [{ date, weight }];
      })
    : [];

export const sanitizeExerciseNotes = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([exerciseId, note]) =>
      typeof note === "string" ? [[exerciseId, note]] : []
    )
  );
};

export const sanitizeSettings = (value: unknown): Partial<WorkoutSettings> => {
  if (!isRecord(value)) return {};

  const sanitized: Partial<WorkoutSettings> = {};

  if (
    typeof value.strengthRestDuration === "number" &&
    Number.isFinite(value.strengthRestDuration)
  ) {
    sanitized.strengthRestDuration = value.strengthRestDuration;
  }

  if (
    typeof value.hypertrophyRestDuration === "number" &&
    Number.isFinite(value.hypertrophyRestDuration)
  ) {
    sanitized.hypertrophyRestDuration = value.hypertrophyRestDuration;
  }

  if (typeof value.soundEnabled === "boolean") {
    sanitized.soundEnabled = value.soundEnabled;
  }

  const weightUnit = normalizeWeightUnit(value.weightUnit);
  if (weightUnit) {
    sanitized.weightUnit = weightUnit;
  }

  return sanitized;
};

export const sanitizeCustomExercises = (value: unknown): ExerciseWiki[] =>
  Array.isArray(value)
    ? value.flatMap((entryValue) => {
        if (!isRecord(entryValue)) return [];

        const id = toTrimmedString(entryValue.id);
        const name = toTrimmedString(entryValue.name);
        const category = normalizeExerciseCategory(entryValue.category);
        const muscles = isRecord(entryValue.muscles) ? entryValue.muscles : null;
        const biomechanics = toTrimmedString(entryValue.biomechanics);
        const notes = toTrimmedString(entryValue.notes);

        if (!id || !name || !category || !muscles || !biomechanics || !notes) {
          return [];
        }

        const primary = toStringArray(muscles.primary);
        const secondary = toStringArray(muscles.secondary);
        const difficulty = normalizeDifficulty(entryValue.difficulty);

        return [
          {
            id,
            name,
            category,
            muscles: {
              primary,
              secondary,
            },
            biomechanics,
            cues: toStringArray(entryValue.cues),
            commonMistakes: toStringArray(entryValue.commonMistakes),
            alternatives: toStringArray(entryValue.alternatives),
            notes,
            youtubeId: toTrimmedString(entryValue.youtubeId) ?? undefined,
            equipment: normalizeExerciseEquipment(entryValue.equipment),
            difficulty: difficulty ?? undefined,
            movementPattern: toTrimmedString(entryValue.movementPattern) ?? undefined,
            bestFor: toStringArray(entryValue.bestFor),
            setupChecklist: toStringArray(entryValue.setupChecklist),
            freeWeightAlternatives: toStringArray(entryValue.freeWeightAlternatives),
            minimalEquipmentAlternatives: toStringArray(
              entryValue.minimalEquipmentAlternatives
            ),
            homeGymFriendly:
              typeof entryValue.homeGymFriendly === "boolean"
                ? entryValue.homeGymFriendly
                : undefined,
          } satisfies ExerciseWiki,
        ];
      })
    : [];

export const sanitizeSyncPayload = (
  value: unknown
): SanitizedSyncPayload | null => {
  if (!isRecord(value)) return null;

  const sanitized: SanitizedSyncPayload = {};

  if ("workoutTemplate" in value) {
    const normalizedTemplate = normalizeWorkoutTemplate(value.workoutTemplate);
    if (normalizedTemplate) {
      sanitized.workoutTemplate = normalizedTemplate;
    }
  }

  if ("progress" in value) {
    sanitized.progress = sanitizeWorkoutProgress(value.progress);
  }

  if ("sessions" in value) {
    sanitized.sessions = sanitizeSessionHistory(value.sessions);
  }

  if ("bodyWeightEntries" in value) {
    sanitized.bodyWeightEntries = sanitizeBodyWeightEntries(value.bodyWeightEntries);
  }

  if ("exerciseNotes" in value) {
    sanitized.exerciseNotes = sanitizeExerciseNotes(value.exerciseNotes);
  }

  if ("settings" in value) {
    sanitized.settings = sanitizeSettings(value.settings);
  }

  if ("customExercises" in value) {
    sanitized.customExercises = sanitizeCustomExercises(value.customExercises);
  }

  if (
    "baseLastSyncedAt" in value &&
    (typeof value.baseLastSyncedAt === "string" || value.baseLastSyncedAt === null)
  ) {
    sanitized.baseLastSyncedAt = value.baseLastSyncedAt;
  }

  if ("lastSyncedAt" in value) {
    const lastSyncedAtValue = value.lastSyncedAt;
    if (
      typeof lastSyncedAtValue === "string" ||
      lastSyncedAtValue instanceof Date ||
      lastSyncedAtValue === null
    ) {
      sanitized.lastSyncedAt = lastSyncedAtValue;
    }
  }

  return sanitized;
};

const parseTimestamp = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const hasRemoteChangesSinceBase = (
  baseLastSyncedAt: string | Date | null | undefined,
  remoteLastSyncedAt: string | Date | null | undefined
): boolean => {
  const remoteTimestamp = parseTimestamp(remoteLastSyncedAt);
  if (remoteTimestamp === null) return false;

  const baseTimestamp = parseTimestamp(baseLastSyncedAt);
  if (baseTimestamp === null) return true;

  return remoteTimestamp > baseTimestamp;
};

export const mergeWorkoutProgressWithPreference = (
  current: WorkoutProgress,
  incoming: WorkoutProgress,
  preferIncomingOnConflict: boolean
): WorkoutProgress => {
  const merged: WorkoutProgress = {};
  const sources = preferIncomingOnConflict ? [current, incoming] : [incoming, current];

  sources.forEach((source) => {
    Object.entries(source).forEach(([dayId, exerciseMap]) => {
      merged[dayId] = merged[dayId] ?? {};

      Object.entries(exerciseMap).forEach(([exerciseId, setMap]) => {
        merged[dayId][exerciseId] = merged[dayId][exerciseId] ?? {};

        Object.entries(setMap).forEach(([setId, savedState]) => {
          merged[dayId][exerciseId][setId] = savedState;
        });
      });
    });
  });

  return merged;
};

export const mergeSessionHistory = (
  current: SessionHistory,
  incoming: SessionHistory,
  preferIncomingOnConflict: boolean
): SessionHistory => {
  const merged = new Map<string, WorkoutSession>();

  current.forEach((session) => {
    merged.set(session.id, session);
  });

  incoming.forEach((session) => {
    const existing = merged.get(session.id);
    if (!existing) {
      merged.set(session.id, session);
      return;
    }

    const existingTime = parseSessionTime(existing.date);
    const incomingTime = parseSessionTime(session.date);

    if (incomingTime > existingTime) {
      merged.set(session.id, session);
      return;
    }

    if (incomingTime < existingTime) {
      return;
    }

    if (preferIncomingOnConflict) {
      merged.set(session.id, session);
    }
  });

  return Array.from(merged.values()).sort(
    (left, right) => parseSessionTime(left.date) - parseSessionTime(right.date)
  );
};

export const mergeBodyWeightEntries = (
  current: BodyWeightEntry[],
  incoming: BodyWeightEntry[],
  preferIncomingOnConflict: boolean
): BodyWeightEntry[] => {
  const merged = new Map<string, BodyWeightEntry>();

  current.forEach((entry) => {
    merged.set(entry.date, entry);
  });

  incoming.forEach((entry) => {
    if (preferIncomingOnConflict || !merged.has(entry.date)) {
      merged.set(entry.date, entry);
    }
  });

  return Array.from(merged.values()).sort((left, right) => left.date.localeCompare(right.date));
};

export const mergeById = <T extends { id: string }>(
  current: T[],
  incoming: T[],
  preferIncomingOnConflict: boolean
): T[] => {
  const merged = new Map<string, T>();

  current.forEach((item) => {
    merged.set(item.id, item);
  });

  incoming.forEach((item) => {
    if (preferIncomingOnConflict || !merged.has(item.id)) {
      merged.set(item.id, item);
    }
  });

  return Array.from(merged.values());
};

export const mergeExerciseNotes = (
  current: Record<string, string>,
  incoming: Record<string, string>,
  preferIncomingOnConflict: boolean
): Record<string, string> =>
  preferIncomingOnConflict ? { ...current, ...incoming } : { ...incoming, ...current };

export const mergeSettings = (
  current: Partial<WorkoutSettings>,
  incoming: Partial<WorkoutSettings>,
  preferIncomingOnConflict: boolean
): Partial<WorkoutSettings> =>
  preferIncomingOnConflict ? { ...current, ...incoming } : { ...incoming, ...current };
