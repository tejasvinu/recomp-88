import { CheckCircle2 } from "lucide-react";
import { cn } from "../utils";

interface DayCompleteOverlayProps {
    show: boolean;
    dayName: string;
}

export default function DayCompleteOverlay({ show, dayName }: DayCompleteOverlayProps) {
    return (
        <div
            className={cn(
                "fixed inset-0 z-60 flex items-center justify-center transition-all duration-500 pointer-events-none",
                show ? "opacity-100" : "opacity-0"
            )}
            role="alert"
            aria-live="assertive"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className={cn(
                    "relative z-10 flex flex-col items-center gap-4 transition-all duration-500",
                    show ? "scale-100 translate-y-0" : "scale-90 translate-y-4"
                )}
            >
                <div className="w-20 h-20 bg-lime-400 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(163,230,53,0.5)]">
                    <CheckCircle2 size={44} className="text-neutral-950" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-white uppercase tracking-widest">Day Done</p>
                    <p className="text-[13px] text-lime-400 font-bold uppercase tracking-widest mt-1">
                        {dayName}
                    </p>
                </div>
            </div>
        </div>
    );
}
