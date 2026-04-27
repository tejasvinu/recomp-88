'use client';

import type { ExerciseWiki, WorkoutTemplate } from '../types';
import ExerciseDetailModal from './ExerciseDetailModal';
import PlateCalculator from './PlateCalculator';
import FinishConfirmModal from './FinishConfirmModal';
import SettingsModal from './SettingsModal';
import WorkoutEditorModal from './WorkoutEditorModal';
import AddPastSessionModal from './AddPastSessionModal';
import { useAppStore } from '../store/appStore';
export interface GlobalModalsProps {
    // Modal visibility flags
    showFinishConfirm: boolean;
    showPlateCalc: boolean;
    showSettings: boolean;
    showWorkoutEditor: boolean;
    showAddPastSession: boolean;
    modalExerciseEntry: ExerciseWiki | null;

    // Workout context
    activeDayName: string;
    elapsedSeconds: number;

    // Callbacks — finish/clear
    onFinishWorkout: () => void;
    onCancelFinish: () => void;

    // Callbacks — settings
    onSetWeightUnit: (fn: (v: 'kg' | 'lbs') => 'kg' | 'lbs') => void;
    onExport: () => void;
    onExportCsv: () => void;
    onExportConfig: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenWorkoutEditor: () => void;
    onOpenAddPastSession: () => void;
    onApplyFreeWeightWorkout: () => void;
    onResetWorkoutTemplate: () => void;
    onClearData: () => void;
    onCloseSettings: () => void;

    // Callbacks — workout editor
    onSaveWorkoutTemplate: (t: WorkoutTemplate) => void;
    onSaveCustomExercise: (ex: ExerciseWiki) => void;
    onCloseWorkoutEditor: () => void;

    // Callbacks — add past session
    onAddPastSessions: (sessions: import('../types').WorkoutSession[]) => void;
    onCloseAddPastSession: () => void;

    // Callbacks — exercise detail / plate calc
    onCloseExerciseDetail: () => void;
    onClosePlateCalc: () => void;
}

/**
 * Container for all app-level modal overlays.
 * Centralises modal rendering so App.tsx (and its replacements) stay lean.
 */
export default function GlobalModals({
    showFinishConfirm,
    showPlateCalc,
    showSettings,
    showWorkoutEditor,
    showAddPastSession,
    modalExerciseEntry,
    activeDayName,
    elapsedSeconds,
    onFinishWorkout,
    onCancelFinish,
    onSetWeightUnit,
    onExport,
    onExportCsv,
    onExportConfig,
    onImport,
    onOpenWorkoutEditor,
    onOpenAddPastSession,
    onApplyFreeWeightWorkout,
    onResetWorkoutTemplate,
    onClearData,
    onCloseSettings,
    onSaveWorkoutTemplate,
    onSaveCustomExercise,
    onCloseWorkoutEditor,
    onAddPastSessions,
    onCloseAddPastSession,
    onCloseExerciseDetail,
    onClosePlateCalc,
}: GlobalModalsProps) {
    const weightUnit = useAppStore((s) => s.weightUnit);
    const strengthRestDuration = useAppStore((s) => s.strengthRestDuration);
    const hypertrophyRestDuration = useAppStore((s) => s.hypertrophyRestDuration);
    const soundEnabled = useAppStore((s) => s.soundEnabled);
    const bodyWeightEntries = useAppStore((s) => s.bodyWeightEntries);
    const customExercises = useAppStore((s) => s.customExercises);
    const workoutTemplate = useAppStore((s) => s.workoutTemplate);
    const setStrengthRestDuration = useAppStore((s) => s.setStrengthRestDuration);
    const setHypertrophyRestDuration = useAppStore((s) => s.setHypertrophyRestDuration);
    const setSoundEnabled = useAppStore((s) => s.setSoundEnabled);
    const sessionCount = useAppStore((s) => s.sessions.length);
    const workoutDayCount = workoutTemplate.length;
    return (
        <>
            {showFinishConfirm && (
                <FinishConfirmModal
                    dayName={activeDayName}
                    elapsedSeconds={elapsedSeconds}
                    onConfirm={onFinishWorkout}
                    onCancel={onCancelFinish}
                />
            )}

            {modalExerciseEntry && (
                <ExerciseDetailModal entry={modalExerciseEntry} onClose={onCloseExerciseDetail} />
            )}

            {showPlateCalc && (
                <PlateCalculator weightUnit={weightUnit} onClose={onClosePlateCalc} />
            )}

            {showSettings && (
                <SettingsModal
                    strengthRestDuration={strengthRestDuration}
                    setStrengthRestDuration={setStrengthRestDuration}
                    hypertrophyRestDuration={hypertrophyRestDuration}
                    setHypertrophyRestDuration={setHypertrophyRestDuration}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    weightUnit={weightUnit}
                    setWeightUnit={onSetWeightUnit}
                    sessionCount={sessionCount}
                    workoutDayCount={workoutDayCount}
                    onExport={onExport}
                    onExportCsv={onExportCsv}
                    onExportConfig={onExportConfig}
                    onImport={onImport}
                    onOpenWorkoutEditor={onOpenWorkoutEditor}
                    onOpenAddPastSession={onOpenAddPastSession}
                    onApplyFreeWeightWorkout={onApplyFreeWeightWorkout}
                    onResetWorkoutTemplate={onResetWorkoutTemplate}
                    onClearData={onClearData}
                    onClose={onCloseSettings}
                />
            )}

            {showWorkoutEditor && (
                <WorkoutEditorModal
                    workoutTemplate={workoutTemplate}
                    customExercises={customExercises}
                    onSave={onSaveWorkoutTemplate}
                    onSaveCustomExercise={onSaveCustomExercise}
                    onClose={onCloseWorkoutEditor}
                />
            )}

            {showAddPastSession && (
                <AddPastSessionModal
                    workoutTemplate={workoutTemplate}
                    bodyWeightEntries={bodyWeightEntries}
                    weightUnit={weightUnit}
                    onAddSessions={onAddPastSessions}
                    onClose={onCloseAddPastSession}
                />
            )}
        </>
    );
}
