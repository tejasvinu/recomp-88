'use client';

import { useState } from "react";
import { Save } from "lucide-react";
import { formatTime } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";
import { Sheet, SheetHandle } from "./ui/Sheet";

interface FinishConfirmModalProps {
    dayName: string;
    elapsedSeconds: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function FinishConfirmModal({
    dayName,
    elapsedSeconds,
    onConfirm,
    onCancel,
}: FinishConfirmModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    useModalEscape(onCancel);

    const handleConfirm = () => {
        if (isSaving) return;
        setIsSaving(true);
        onConfirm();
        // Component will unmount when the modal closes, so no need to reset isSaving
    };

    return (
        <Sheet onClose={onCancel} labelledBy="finish-confirm-title" className="p-5">
            <SheetHandle className="mb-5" />
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-accent-400/10 border border-accent-400/20 rounded-2xl flex items-center justify-center">
                    <Save size={24} className="text-accent-400" />
                </div>
                <div>
                    <h3
                        id="finish-confirm-title"
                        className="text-[17px] font-black text-white tracking-wide"
                    >
                        {dayName}
                    </h3>
                    <p className="text-body text-neutral-400 font-medium mt-1">
                        Save this session to history and clear checkmarks?
                    </p>
                    {elapsedSeconds > 0 && (
                        <p className="text-caption text-neutral-600 font-medium mt-2">
                            Duration:{" "}
                            <span className="text-accent-400 font-mono">{formatTime(elapsedSeconds)}</span>
                        </p>
                    )}
                </div>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-xl border border-white/8 bg-white/4 text-neutral-400 font-bold text-body hover:bg-white/8 hover:text-white transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-xl border border-accent-400/30 bg-accent-400/15 text-accent-400 font-black text-body hover:bg-accent-400/25 transition-all disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Workout"}
                    </button>
                </div>
            </div>
        </Sheet>
    );
}
