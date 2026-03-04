import { cn } from "../../utils";
import type { ToastItem } from "../../hooks/useToast";
import { Undo2 } from "lucide-react";

interface ToastContainerProps {
    toasts: ToastItem[];
    onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-100 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
            role="status"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-down pointer-events-auto",
                        toast.type === "success"
                            ? "bg-neutral-900/95 border-lime-400/25 text-white"
                            : "bg-neutral-900/95 border-red-400/30 text-white"
                    )}
                >
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            toast.type === "success" ? "bg-lime-400" : "bg-red-400"
                        )}
                    />
                    <span className="text-[13px] font-semibold flex-1">{toast.message}</span>
                    {toast.undoAction && (
                        <button
                            onClick={() => {
                                toast.undoAction?.();
                                onDismiss(toast.id);
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-lime-400 hover:text-lime-300 transition-colors uppercase tracking-wider shrink-0"
                        >
                            <Undo2 size={12} />
                            Undo
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
