import { RotateCcw } from "lucide-react";
import { formatTime } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";

interface FinishConfirmModalProps {
    dayName: string;
    elapsedSeconds: number;
    isTimerRunning: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function FinishConfirmModal({
    dayName,
    elapsedSeconds,
    isTimerRunning,
    onConfirm,
    onCancel,
}: FinishConfirmModalProps) {
    useModalEscape(onCancel);

    return (
        <div
            className="fixed inset-0 z-70 flex items-end sm:items-center justify-center"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-confirm-title"
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up p-5"
            >
                <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-5 sm:hidden" />
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center">
                        <RotateCcw size={24} className="text-lime-400" />
                    </div>
                    <div>
                        <h3
                            id="finish-confirm-title"
                            className="text-[17px] font-black text-white tracking-wide"
                        >
                            {dayName}
                        </h3>
                        <p className="text-[13px] text-neutral-400 font-medium mt-1">
                            Save this session and reset checkmarks?
                        </p>
                        {isTimerRunning && (
                            <p className="text-[11px] text-neutral-600 font-medium mt-2">
                                Duration:{" "}
                                <span className="text-lime-400 font-mono">{formatTime(elapsedSeconds)}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl border border-white/8 bg-white/4 text-neutral-400 font-bold text-[13px] hover:bg-white/8 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 rounded-xl border border-lime-400/30 bg-lime-400/15 text-lime-400 font-black text-[13px] hover:bg-lime-400/25 transition-all"
                        >
                            Save &amp; Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
