'use client';

import { useRef } from "react";
import {
    X,
    Timer,
    Minus,
    Plus,
    Volume2,
    VolumeX,
    Download,
    Upload,
    Scale,
    Dumbbell,
    RotateCcw,
    ArrowLeftRight,
} from "lucide-react";
import { cn } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";

const REST_STEP = 15;
const REST_MIN = 30;
const REST_MAX = 300;

interface SettingsModalProps {
    strengthRestDuration: number;
    setStrengthRestDuration: (fn: (v: number) => number) => void;
    hypertrophyRestDuration: number;
    setHypertrophyRestDuration: (fn: (v: number) => number) => void;
    soundEnabled: boolean;
    setSoundEnabled: (fn: (v: boolean) => boolean) => void;
    weightUnit: "kg" | "lbs";
    setWeightUnit: (fn: (v: "kg" | "lbs") => "kg" | "lbs") => void;
    sessionCount: number;
    workoutDayCount: number;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenWorkoutEditor: () => void;
    onApplyFreeWeightWorkout: () => void;
    onResetWorkoutTemplate: () => void;
    onClearData: () => void;
    onClose: () => void;
}

export default function SettingsModal({
    strengthRestDuration,
    setStrengthRestDuration,
    hypertrophyRestDuration,
    setHypertrophyRestDuration,
    soundEnabled,
    setSoundEnabled,
    weightUnit,
    setWeightUnit,
    sessionCount,
    workoutDayCount,
    onExport,
    onImport,
    onOpenWorkoutEditor,
    onApplyFreeWeightWorkout,
    onResetWorkoutTemplate,
    onClearData,
    onClose,
}: SettingsModalProps) {
    useModalEscape(onClose);
    const importRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className="fixed inset-0 z-70 flex items-end sm:items-center justify-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up"
            >
                <div className="border-b border-white/6 px-5 pt-5 pb-4">
                    <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <h2 id="settings-title" className="text-[16px] font-black text-white tracking-wide">
                            Settings
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/7"
                            aria-label="Close settings"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh] overscroll-contain">
                    {/* Rest Timer Customization */}
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Timer size={12} className="text-lime-400" />
                            Rest Timers
                        </p>
                        <div className="flex flex-col gap-2">
                            {[
                                {
                                    label: "Strength",
                                    desc: "After strength sets",
                                    value: strengthRestDuration,
                                    set: setStrengthRestDuration,
                                },
                                {
                                    label: "Hypertrophy",
                                    desc: "After hypertrophy sets",
                                    value: hypertrophyRestDuration,
                                    set: setHypertrophyRestDuration,
                                },
                            ].map(({ label, desc, value, set }) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between bg-white/4 border border-white/7 rounded-xl px-4 py-3"
                                >
                                    <div>
                                        <p className="text-[13px] font-bold text-white">{label}</p>
                                        <p className="text-[10px] text-neutral-500 font-medium mt-0.5">{desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => set((v) => Math.max(REST_MIN, v - REST_STEP))}
                                            className="w-7 h-7 bg-white/6 hover:bg-white/12 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white border border-white/8 transition-all active:scale-90"
                                            aria-label={`Decrease ${label.toLowerCase()} rest by ${REST_STEP} seconds`}
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-[14px] font-mono font-bold text-lime-400 tabular-nums w-12 text-center">
                                            {value}s
                                        </span>
                                        <button
                                            onClick={() => set((v) => Math.min(REST_MAX, v + REST_STEP))}
                                            className="w-7 h-7 bg-white/6 hover:bg-white/12 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white border border-white/8 transition-all active:scale-90"
                                            aria-label={`Increase ${label.toLowerCase()} rest by ${REST_STEP} seconds`}
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weight Unit Toggle */}
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Scale size={12} className="text-lime-400" />
                            Weight Unit
                        </p>
                        <div className="flex gap-2">
                            {(["kg", "lbs"] as const).map((unit) => (
                                <button
                                    key={unit}
                                    onClick={() => setWeightUnit(() => unit)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl border font-bold text-[13px] uppercase tracking-widest transition-all",
                                        weightUnit === unit
                                            ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                                            : "bg-white/4 border-white/7 text-neutral-500 hover:bg-white/7 hover:text-neutral-300"
                                    )}
                                >
                                    {unit}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sound Toggle */}
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            {soundEnabled ? (
                                <Volume2 size={12} className="text-lime-400" />
                            ) : (
                                <VolumeX size={12} className="text-neutral-500" />
                            )}
                            Audio
                        </p>
                        <button
                            onClick={() => setSoundEnabled((v) => !v)}
                            className="flex items-center justify-between w-full bg-white/4 border border-white/7 rounded-xl px-4 py-3"
                            aria-pressed={soundEnabled}
                        >
                            <div>
                                <p className="text-[13px] font-bold text-white text-left">Timer end beep</p>
                                <p className="text-[10px] text-neutral-500 font-medium mt-0.5 text-left">
                                    Play sound when rest timer finishes
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "w-11 h-6 rounded-full border transition-all relative shrink-0",
                                    soundEnabled
                                        ? "bg-lime-400/20 border-lime-400/40"
                                        : "bg-white/6 border-white/10"
                                )}
                            >
                                <div
                                    className={cn(
                                        "absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200",
                                        soundEnabled ? "left-5 bg-lime-400" : "left-0.5 bg-neutral-500"
                                    )}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Workout Template */}
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Dumbbell size={12} className="text-lime-400" />
                            Workout Program
                        </p>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={onOpenWorkoutEditor}
                                className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                            >
                                <div className="w-9 h-9 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Dumbbell size={16} className="text-lime-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-bold text-white group-hover:text-lime-400 transition-colors">
                                        Edit Workout
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                        Customize the shipped {workoutDayCount}-day routine
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={onApplyFreeWeightWorkout}
                                className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                            >
                                <div className="w-9 h-9 bg-sky-400/10 border border-sky-400/20 rounded-xl flex items-center justify-center shrink-0">
                                    <ArrowLeftRight size={16} className="text-sky-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-bold text-white">
                                        Apply Free-Weight Friendly Swaps
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                        Replace machine-locked movements with accessible alternatives
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm("Reset your workout plan back to the default program? Your saved history will be kept.")) {
                                        onResetWorkoutTemplate();
                                    }
                                }}
                                className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                            >
                                <div className="w-9 h-9 bg-white/6 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                                    <RotateCcw
                                        size={16}
                                        className="text-neutral-400 group-hover:text-white transition-colors"
                                    />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-bold text-white">
                                        Revert to Default Workout
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                        Restore the standard plan without clearing progress history
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Data / Backup */}
                    <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Download size={12} className="text-lime-400" />
                            Data Backup
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={onExport}
                                className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                            >
                                <div className="w-9 h-9 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Download size={16} className="text-lime-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-bold text-white group-hover:text-lime-400 transition-colors">
                                        Export JSON
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                        Download your workout plan, progress, sessions &amp; notes
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => importRef.current?.click()}
                                className="flex items-center gap-3 w-full bg-white/4 hover:bg-white/7 border border-white/8 rounded-xl px-4 py-3.5 transition-all group"
                            >
                                <div className="w-9 h-9 bg-white/6 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                                    <Upload
                                        size={16}
                                        className="text-neutral-400 group-hover:text-white transition-colors"
                                    />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-bold text-white">Import JSON</p>
                                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                                        Restore from a previous export
                                    </p>
                                </div>
                            </button>

                            <input
                                ref={importRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={onImport}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                        <span className="text-neutral-400 font-bold">Sessions saved:</span>{" "}
                        {sessionCount} workout{sessionCount !== 1 ? "s" : ""} logged
                    </p>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] mt-2 border-t border-white/6 flex justify-center">
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to delete all workout history and preferences? This action cannot be undone.")) {
                                onClearData();
                            }
                        }}
                        className="bg-red-400/10 hover:bg-red-400/20 text-red-400 font-bold uppercase tracking-widest text-[11px] px-6 py-3 rounded-xl border border-red-400/20 transition-all active:scale-95"
                    >
                        Reset All Data
                    </button>
                </div>
            </div>
        </div>
    );
}
