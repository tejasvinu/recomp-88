import { Timer, X, Pause, Play } from "lucide-react";
import { cn, formatTime } from "../utils";

interface RestTimerToastProps {
    restTimer: number | null;
    timerPercent: number;
    restType: "strength" | "hypertrophy" | null;
    isPaused: boolean;
    onDismiss: () => void;
    onTogglePause: () => void;
}

export default function RestTimerToast({
    restTimer,
    timerPercent,
    restType,
    isPaused,
    onDismiss,
    onTogglePause,
}: RestTimerToastProps) {
    return (
        <div
            className={cn(
                "fixed bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[380px] bg-neutral-900/95 backdrop-blur-2xl border border-white/8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500 z-50",
                restTimer !== null
                    ? "translate-y-0 opacity-100"
                    : "translate-y-[200%] opacity-0 pointer-events-none"
            )}
            role="timer"
            aria-label={
                restTimer !== null ? `Rest timer: ${formatTime(restTimer)} remaining` : undefined
            }
        >
            <div className="h-[2px] bg-white/6 w-full">
                <div
                    className={cn(
                        "h-full transition-all duration-1000 ease-linear",
                        isPaused ? "bg-yellow-400" : "bg-lime-400"
                    )}
                    style={{ width: `${timerPercent}%` }}
                />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "w-9 h-9 border rounded-xl flex items-center justify-center shrink-0",
                            isPaused
                                ? "bg-yellow-400/10 border-yellow-400/20"
                                : "bg-lime-400/10 border-lime-400/20"
                        )}
                    >
                        <Timer
                            size={18}
                            strokeWidth={2}
                            className={isPaused ? "text-yellow-400" : "text-lime-400"}
                        />
                    </div>
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 tracking-widest uppercase block leading-none mb-1">
                            {restType === "strength" ? "Strength Rest" : "Hypertrophy Rest"}
                            {isPaused && " · Paused"}
                        </span>
                        <span className="text-2xl font-mono font-bold text-white tabular-nums leading-none">
                            {restTimer !== null ? formatTime(restTimer) : "0:00"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onTogglePause}
                        className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors border border-white/7"
                        aria-label={isPaused ? "Resume timer" : "Pause timer"}
                    >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button
                        onClick={onDismiss}
                        className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors border border-white/7"
                        aria-label="Dismiss timer"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
