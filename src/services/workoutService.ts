'use client';

/**
 * workoutService.ts
 *
 * Business-logic helpers that operate on workout data structures.
 * Functions here are pure (no side-effects, no React hooks) and can be unit
 * tested in isolation.
 */

import {
    createDefaultWorkoutTemplate,
    getExerciseSetsWithExtras,
    isExtraSetState,
    normalizeWorkoutTemplate,
    pruneExerciseNotesForWorkoutTemplate,
    pruneProgressForWorkoutTemplate,
} from '../data';
import {
    findWikiEntry,
    isFreeWeightFriendly,
    resolvePrimaryFreeWeightAlternative,
} from '../wikiData';
import { toLocalDateKey } from '../utils';
import { snapshotPlan, type SessionTiming } from '../lib/sessionMetadata';
import { dateInTimezone } from '../lib/calendar';
import { displayBodyWeight, sessionVolumeKg, convertMass, resolveSetLoad } from '../lib/trainingMath';
import type {
    WorkoutTemplate,
    WorkoutProgress,
    SessionHistory,
    WorkoutSession,
    BodyWeightEntry,
} from '../types';

// ─── ID helpers ──────────────────────────────────────────────────────────────
const slugifyName = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);

export const createWorkoutExerciseId = (dayId: string, exerciseName: string) => {
    const suffix =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().slice(0, 6)
            : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return `${dayId}-${slugifyName(exerciseName) || 'exercise'}-${suffix}`;
};

// ─── Apply workout template ───────────────────────────────────────────────────
export interface ApplyTemplateResult {
    template: WorkoutTemplate;
    prunedProgress: WorkoutProgress;
    prunedNotes: Record<string, string>;
}

export function applyWorkoutTemplate(
    nextTemplate: WorkoutTemplate,
    currentProgress: WorkoutProgress,
    currentNotes: Record<string, string>,
): ApplyTemplateResult | null {
    const normalized = normalizeWorkoutTemplate(nextTemplate);
    if (!normalized) return null;

    return {
        template: normalized,
        prunedProgress: pruneProgressForWorkoutTemplate(currentProgress, normalized),
        prunedNotes: pruneExerciseNotesForWorkoutTemplate(currentNotes, normalized),
    };
}

// ─── Reset workout template ───────────────────────────────────────────────────
export function buildDefaultTemplate(): WorkoutTemplate {
    return createDefaultWorkoutTemplate();
}

// ─── Convert to free-weight-friendly template ────────────────────────────────
export interface FreeWeightConversionResult {
    template: WorkoutTemplate;
    replacementCount: number;
}

export function convertToFreeWeightTemplate(
    currentTemplate: WorkoutTemplate,
): FreeWeightConversionResult {
    let replacementCount = 0;
    const converted = currentTemplate.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => {
            const entry = findWikiEntry(exercise.name);
            if (!entry || isFreeWeightFriendly(entry)) return exercise;

            const alternative = resolvePrimaryFreeWeightAlternative(entry.name);
            if (!alternative || alternative === exercise.name) return exercise;

            replacementCount += 1;
            return {
                ...exercise,
                id: createWorkoutExerciseId(day.id, alternative),
                name: alternative,
            };
        }),
    }));
    return { template: converted, replacementCount };
}

// ─── Build a WorkoutSession from current progress ────────────────────────────
export function buildWorkoutSession(
    activeDay: WorkoutTemplate[number],
    dayProgress: WorkoutProgress[string] | undefined,
    bodyWeightEntries: BodyWeightEntry[],
    weightUnit: 'kg' | 'lbs',
    durationSeconds: number,
    timing: SessionTiming = {},
): WorkoutSession | null {
    if (!dayProgress) return null;

    const hasData = activeDay.exercises.some((ex) =>
        getExerciseSetsWithExtras(ex, dayProgress[ex.id]).some((set) => {
            const s = dayProgress[ex.id]?.[set.id];
            return s && (s.loggedWeight || s.loggedReps || s.completed);
        }),
    );
    if (!hasData) return null;

    const nowIso = new Date().toISOString();
    const timezone = timing.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayKey = dateInTimezone(timing.startedAt ?? nowIso, timezone);
    const knownEntry = bodyWeightEntries.filter(e => e.date <= dayKey && e.weightUnit)
        .sort((a,b) => b.date.localeCompare(a.date))[0];
    const currentBodyWeight = knownEntry ? displayBodyWeight(knownEntry, weightUnit).weight : undefined;

    const session: WorkoutSession = {
        id: `${activeDay.id}-${Date.now()}`,
        date: nowIso,
        dayId: activeDay.id,
        dayName: activeDay.name,
        bodyWeightSnapshot: currentBodyWeight,
        bodyWeightUnit: currentBodyWeight !== undefined ? weightUnit : undefined,
        weightUnit,
        ...snapshotPlan(activeDay),
        ...timing,
        timezone,
        timestampQuality: timing.timestampQuality ?? (timing.startedAt ? 'observed' : 'recorded_only'),
        endedAt: timing.endedAt ?? nowIso,
        recordedAt: nowIso,
        updatedAt: nowIso,
        duration: durationSeconds,
        exercises: activeDay.exercises
            .map((ex) => ({
                exerciseId: ex.id,
                name: ex.name,
                type: ex.type,
                sets: getExerciseSetsWithExtras(ex, dayProgress[ex.id])
                    .map((set) => {
                        const s = dayProgress[ex.id]?.[set.id];
                        return {
                            weightUnit: s?.weightUnit ?? weightUnit,
                            setId: set.id,
                            targetReps: set.targetReps,
                            loggedWeight: s?.loggedWeight || '',
                            loggedReps: s?.loggedReps || '',
                            completed: s?.completed || false,
                            ...(s?.completedAt != null ? { completedAt: s.completedAt } : {}),
                            ...(s?.rpe != null ? { rpe: s.rpe } : {}),
                            ...(s?.setType ? { setType: s.setType } : {}),
                            ...(isExtraSetState(set.id, s) ? { isExtra: true } : {}),
                        };
                    })
                    .filter((s) => s.loggedWeight || s.loggedReps || s.completed),
            }))
            .filter((ex) => ex.sets.length > 0),
    };

    session.totalTonnage = convertMass(sessionVolumeKg(session), "kg", weightUnit);
    return session;
}

// ─── Log body weight ─────────────────────────────────────────────────────────
export function upsertBodyWeightEntry(
    entries: BodyWeightEntry[],
    weight: number,
): BodyWeightEntry[] {
    const today = toLocalDateKey();
    const filtered = entries.filter((e) => e.date !== today);
    return [...filtered, { date: today, weight }].sort((a, b) => a.date.localeCompare(b.date));
}

// ─── PR computation ───────────────────────────────────────────────────────────
export function computeAllTimePRs(
    template: WorkoutTemplate,
    sessions: SessionHistory,
    bodyWeightEntries: BodyWeightEntry[],
    weightUnit: 'kg' | 'lbs',
): Record<string, number> {
    const prs: Record<string, number> = {};
    void bodyWeightEntries; // Historical PRs depend on the session snapshot only.
    template.forEach(day => day.exercises.forEach(exercise => {
        let best = 0;
        sessions.forEach(session => session.exercises.filter(ex => ex.exerciseId === exercise.id).forEach(ex => ex.sets.forEach(set => {
            const load = resolveSetLoad(set, session);
            if (load.eligible && set.setType !== 'warmup' && load.loadKg !== null) best = Math.max(best, convertMass(load.loadKg, 'kg', weightUnit));
        })));
        prs[exercise.id] = best;
    }));
    return prs;
}

export interface GlobalExerciseRecord {
    /** Display name (best-effort merge when the same lift appears with different casing). */
    name: string;
    /** Heaviest resolved weight on any single set (kg or lbs per settings). */
    maxWeight: number;
    /** Largest volume (Σ weight × reps per set) for that exercise within one session. */
    maxSessionTonnage: number;
}

/**
 * Aggregates all logged sessions: one row per exercise name (case-insensitive).
 */
export function computeGlobalExerciseRecords(
    sessions: SessionHistory,
    bodyWeightEntries: BodyWeightEntry[],
    weightUnit: 'kg' | 'lbs',
): GlobalExerciseRecord[] {
    void bodyWeightEntries;
    const byKey = new Map<
        string,
        { displayName: string; maxWeight: number; maxSessionTonnage: number }
    >();

    for (const session of sessions) {
        for (const ex of session.exercises) {
            const trimmed = ex.name.trim();
            const key = trimmed.toLowerCase();
            if (!key) continue;

            let sessionTonnage = 0;
            let maxWSession = 0;
            for (const set of ex.sets) {
                const load = resolveSetLoad(set, session);
                if (!load.eligible || set.setType === 'warmup') continue;
                const w = convertMass(load.loadKg!, 'kg', weightUnit);
                const r = load.reps!;
                if (w > 0 && r > 0) {
                    sessionTonnage += w * r;
                }
                if (w > maxWSession) maxWSession = w;
            }

            const prev = byKey.get(key);
            const displayName =
                !prev || trimmed.length > prev.displayName.length ? trimmed : prev.displayName;

            if (!prev) {
                byKey.set(key, {
                    displayName,
                    maxWeight: maxWSession,
                    maxSessionTonnage: Math.round(sessionTonnage),
                });
            } else {
                prev.displayName = displayName;
                prev.maxWeight = Math.max(prev.maxWeight, maxWSession);
                prev.maxSessionTonnage = Math.max(
                    prev.maxSessionTonnage,
                    Math.round(sessionTonnage),
                );
            }
        }
    }

    return [...byKey.values()]
        .map((row) => ({
            name: row.displayName,
            maxWeight: Math.round(row.maxWeight * 100) / 100,
            maxSessionTonnage: row.maxSessionTonnage,
        }))
        .filter((row) => row.maxWeight > 0 || row.maxSessionTonnage > 0)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

// ─── Last session values per day/exercise/set ────────────────────────────────
export function computeLastSessionValues(
    template: WorkoutTemplate,
    sessions: SessionHistory,
): Record<string, Record<string, Record<string, { weight: string; reps: string }>>> {
    const values: Record<string, Record<string, Record<string, { weight: string; reps: string }>>> = {};

    template.forEach((day) => {
        const daySessions = sessions
            .filter((s) => s.dayId === day.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (daySessions.length === 0) return;

        values[day.id] = {};
        day.exercises.forEach((exercise) => {
            const match = daySessions
                .flatMap((s) => s.exercises)
                .find((se) => se.exerciseId === exercise.id || se.name === exercise.name);

            if (!match) return;

            values[day.id][exercise.id] = {};
            exercise.sets.forEach((set, i) => {
                const prev = match.sets[i];
                if (!prev) return;
                values[day.id][exercise.id][set.id] = {
                    weight: prev.loggedWeight,
                    reps: prev.loggedReps,
                };
            });
        });
    });

    return values;
}

// ─── Day progress percent ─────────────────────────────────────────────────────
export function computeProgressPercent(
    day: WorkoutTemplate[number],
    progress: WorkoutProgress,
): number {
    let total = 0;
    let completed = 0;
    day.exercises.forEach((ex) => {
        const sets = getExerciseSetsWithExtras(ex, progress[day.id]?.[ex.id]);
        total += sets.length;
        sets.forEach((set) => {
            if (progress[day.id]?.[ex.id]?.[set.id]?.completed) completed++;
        });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}
