'use client';

import type { ReactNode } from "react";
import { cn } from "../../utils";

interface SheetProps {
    onClose: () => void;
    labelledBy?: string;
    /** Stacking layer. Nested sheets need a higher layer than their parent. */
    layer?: "z-70" | "z-80" | "z-90";
    /** Backdrop darkness. */
    dim?: "normal" | "strong";
    width?: "md" | "wide";
    /** Extra classes for the panel (padding, flex layout, max height). */
    className?: string;
    /** Extra classes for the full-screen wrapper (e.g. outer padding). */
    wrapperClassName?: string;
    children: ReactNode;
}

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Clicking the backdrop
 * closes it. Escape handling stays with the caller (useModalEscape).
 */
export function Sheet({
    onClose,
    labelledBy,
    layer = "z-70",
    dim = "normal",
    width = "md",
    className,
    wrapperClassName,
    children,
}: SheetProps) {
    return (
        <div
            className={cn("fixed inset-0 flex items-end sm:items-center justify-center", layer, wrapperClassName)}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
        >
            <div className={cn("absolute inset-0 backdrop-blur-sm", dim === "strong" ? "bg-black/80" : "bg-black/75")} />
            <div
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "relative z-10 w-full bg-sheet border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl overflow-hidden animate-slide-up",
                    width === "md" ? "max-w-md sm:rounded-2xl" : "max-w-3xl sm:rounded-3xl",
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}

/** Grab handle shown at the top of a sheet on phones. */
export function SheetHandle({ className }: { className?: string }) {
    return <div className={cn("w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden", className)} />;
}
