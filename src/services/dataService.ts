'use client';

/**
 * dataService.ts
 *
 * Stateless helpers for data-intensive IO operations:
 *   – JSON backup export / import
 *   – CSV session export
 *
 * These functions are intentionally decoupled from any React state; they
 * receive data as arguments and return results (or trigger side-effects like
 * downloads). The calling component/hook is responsible for passing data in
 * and applying any returned changes back to the store.
 */

import { sanitizeSyncPayload } from '../lib/sync';
import { pruneExerciseNotesForWorkoutTemplate, pruneProgressForWorkoutTemplate } from '../data';
import { normalizeWorkoutTemplate } from '../data';
import type { AppDataSnapshot, SessionHistory } from '../types';

// ─── File download helper ───────────────────────────────────────────────────
function downloadFile(parts: BlobPart[], type: string, filename: string) {
    const blob = new Blob(parts, { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function escapeCsvValue(value: string | number | null | undefined): string {
    return `"${String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
}

// ─── Export JSON backup ───────────────────────────────────────────────────────
export function exportJsonBackup(snapshot: AppDataSnapshot): void {
    const payload = {
        ...snapshot,
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
    };
    downloadFile(
        [JSON.stringify(payload, null, 2)],
        'application/json',
        `recomp88-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
export type CsvExportResult = { ok: true } | { ok: false; reason: string };

export function exportSessionsCsv(sessions: SessionHistory): CsvExportResult {
    const rows = sessions.flatMap((session) =>
        session.exercises.flatMap((exercise) =>
            exercise.sets.map((set, index) => [
                session.date,
                exercise.name,
                index + 1,
                set.loggedWeight,
                set.loggedReps,
            ]),
        ),
    );

    if (rows.length === 0) {
        return { ok: false, reason: 'No session history to export yet' };
    }

    const csv = [['Date', 'Exercise', 'Set', 'Weight', 'Reps'], ...rows]
        .map((row) => row.map((v) => escapeCsvValue(v)).join(','))
        .join('\r\n');

    downloadFile(
        [csv],
        'text/csv;charset=utf-8',
        `recomp88-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    return { ok: true };
}

// ─── Import JSON backup ──────────────────────────────────────────────────────
export type ImportResult =
    | { ok: true; snapshot: AppDataSnapshot }
    | { ok: false; reason: string };

const hasImportableSyncFields = (
    value: ReturnType<typeof sanitizeSyncPayload>,
): value is NonNullable<ReturnType<typeof sanitizeSyncPayload>> =>
    !!value &&
    (
        value.workoutTemplate !== undefined ||
        value.progress !== undefined ||
        value.sessions !== undefined ||
        value.bodyWeightEntries !== undefined ||
        value.exerciseNotes !== undefined ||
        value.settings !== undefined ||
        value.customExercises !== undefined
    );

export function parseImportFile(rawText: string, fallback: AppDataSnapshot): ImportResult {
    try {
        const rawData = JSON.parse(rawText);
        const data = sanitizeSyncPayload(rawData);
        if (!hasImportableSyncFields(data)) throw new Error('Invalid format');

        const importedWorkoutTemplate =
            normalizeWorkoutTemplate(data.workoutTemplate) ?? fallback.workoutTemplate;

        const snapshot: AppDataSnapshot = {
            workoutTemplate: importedWorkoutTemplate,
            progress: data.progress !== undefined
                ? pruneProgressForWorkoutTemplate(data.progress, importedWorkoutTemplate)
                : fallback.progress,
            sessions: data.sessions ?? fallback.sessions,
            bodyWeightEntries: data.bodyWeightEntries ?? fallback.bodyWeightEntries,
            exerciseNotes: data.exerciseNotes !== undefined
                ? pruneExerciseNotesForWorkoutTemplate(data.exerciseNotes, importedWorkoutTemplate)
                : fallback.exerciseNotes,
            customExercises: data.customExercises ?? fallback.customExercises,
            settings: {
                strengthRestDuration:
                    typeof data.settings?.strengthRestDuration === 'number'
                        ? data.settings.strengthRestDuration
                        : fallback.settings.strengthRestDuration,
                hypertrophyRestDuration:
                    typeof data.settings?.hypertrophyRestDuration === 'number'
                        ? data.settings.hypertrophyRestDuration
                        : fallback.settings.hypertrophyRestDuration,
                soundEnabled:
                    typeof data.settings?.soundEnabled === 'boolean' ? data.settings.soundEnabled : fallback.settings.soundEnabled,
                weightUnit:
                    data.settings?.weightUnit === 'kg' || data.settings?.weightUnit === 'lbs'
                        ? data.settings.weightUnit
                        : fallback.settings.weightUnit,
            },
        };

        return { ok: true, snapshot };
    } catch {
        return { ok: false, reason: 'Failed to parse backup file' };
    }
}
