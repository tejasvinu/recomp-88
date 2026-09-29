'use client';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils";

/*
 * Shared building blocks. Style decisions live here so a redesign edits one
 * file instead of every screen. They carry no app logic: behaviour comes in
 * through props.
 */

export type Tone = "accent" | "info" | "warn" | "danger" | "strength" | "rose" | "neutral";

// ─── Card ─────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("bg-neutral-900/50 border border-white/6 rounded-2xl shadow-lg", className)} {...props} />;
}

// ─── Chip ─────────────────────────────────────────────────────────────────
const CHIP_TONES: Record<Tone, string> = {
    accent: "text-accent-400 bg-accent-400/10 border-accent-400/25",
    info: "text-info-400 bg-info-500/10 border-info-500/20",
    warn: "text-warn-400 bg-warn-400/10 border-warn-400/25",
    danger: "text-danger-400 bg-danger-400/10 border-danger-400/25",
    strength: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    neutral: "text-neutral-400 bg-white/5 border-white/8",
};

/** Small uppercase label. Pass `as="button"` props via ChipButton for toggles. */
export function Chip({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
    return (
        <span
            className={cn("text-micro uppercase font-black tracking-widest px-2 py-0.5 rounded-md border", CHIP_TONES[tone], className)}
            {...props}
        />
    );
}

/** Chip that toggles something; `active` uses the tone, inactive is muted. */
export function ChipButton({
    tone = "accent",
    active,
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; active: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={cn(
                "text-micro uppercase font-black tracking-widest px-2 py-0.5 rounded-md border transition-all",
                active ? CHIP_TONES[tone] : "text-neutral-600 bg-white/3 border-white/6 hover:text-neutral-400 hover:bg-white/6",
                className
            )}
            {...props}
        />
    );
}

// ─── IconButton ───────────────────────────────────────────────────────────
const ICON_HOVER: Record<"accent" | "neutral" | "danger" | "info", string> = {
    accent: "hover:text-accent-400 hover:bg-accent-400/10 hover:border-accent-400/20",
    neutral: "hover:text-neutral-300 hover:bg-white/8",
    danger: "hover:text-danger-400 hover:bg-danger-400/10 hover:border-danger-400/20",
    info: "hover:bg-info-400/10 hover:text-info-400 hover:border-info-400/20",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Required: icon-only buttons need an accessible name. */
    "aria-label": string;
    size?: "xs" | "sm" | "md";
    shape?: "square" | "round";
    hover?: keyof typeof ICON_HOVER;
    /** Highlighted state (e.g. notes open). */
    active?: boolean;
}

export function IconButton({ size = "md", shape = "square", hover = "neutral", active = false, className, ...props }: IconButtonProps) {
    return (
        <button
            type="button"
            className={cn(
                "shrink-0 flex items-center justify-center border transition-all",
                size === "md" && "w-8 h-8",
                size === "sm" && "w-7 h-7",
                size === "xs" && "w-6 h-6",
                shape === "square" ? "rounded-xl" : "rounded-full",
                active
                    ? "bg-accent-400/15 border-accent-400/30 text-accent-400"
                    : cn("bg-white/5 border-white/8 text-neutral-500", ICON_HOVER[hover]),
                className
            )}
            {...props}
        />
    );
}

// ─── ActionButton ─────────────────────────────────────────────────────────
const ACTION_TONES: Record<Tone | "plain" | "ghost", string> = {
    accent: "bg-accent-400/10 hover:bg-accent-400/20 border-accent-400/25 text-accent-400",
    info: "bg-info-400/10 hover:bg-info-400/20 border-info-400/25 text-info-400",
    warn: "bg-warn-500/15 hover:bg-warn-500/25 border-warn-500/40 text-warn-500",
    danger: "bg-danger-400/10 hover:bg-danger-400/20 border-danger-400/25 text-danger-400",
    strength: "bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/40 text-orange-500",
    rose: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-500",
    neutral: "bg-white/4 hover:bg-white/7 border-white/9 text-white",
    plain: "bg-white/5 hover:bg-white/8 border-white/10 text-white",
    ghost: "bg-white/3 hover:bg-white/6 border-white/8 text-neutral-500",
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tone?: keyof typeof ACTION_TONES;
    /** loud = primary emphasis (black weight, wide tracking); quiet = secondary. */
    emphasis?: "loud" | "quiet";
    icon?: ReactNode;
}

/** Full-width block button used for workout-level actions. */
export function ActionButton({ tone = "neutral", emphasis = "quiet", icon, className, children, ...props }: ActionButtonProps) {
    return (
        <button
            type="button"
            className={cn(
                "w-full active:scale-[0.98] flex items-center justify-center gap-2.5 py-4 rounded-2xl uppercase transition-all border",
                emphasis === "loud" ? "font-black text-body tracking-[0.2em]" : "font-bold text-small tracking-[0.18em]",
                ACTION_TONES[tone],
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}

// ─── SegmentedControl ─────────────────────────────────────────────────────
interface SegmentedControlProps<T extends string> {
    options: ReadonlyArray<{ value: T; label: ReactNode }>;
    value: T;
    onChange: (value: T) => void;
    className?: string;
    "aria-label"?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className, ...rest }: SegmentedControlProps<T>) {
    return (
        <div role="tablist" aria-label={rest["aria-label"]} className={cn("flex bg-white/4 rounded-xl p-1 border border-white/7 gap-1", className)}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-caption font-black uppercase tracking-widest transition-all",
                        value === option.value ? "bg-accent-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-300"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
