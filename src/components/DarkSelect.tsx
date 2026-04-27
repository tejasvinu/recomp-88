"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { cn } from "../utils";

export type DarkSelectOption = { value: string; label: string };

type DarkSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: DarkSelectOption[];
    placeholder?: string;
    className?: string;
    /** Button always shows placeholder (e.g. library picker that resets after pick). */
    triggerLabelMode?: "value" | "placeholder";
    id?: string;
    "aria-labelledby"?: string;
};

export function DarkSelect({
    value,
    onChange,
    options,
    placeholder = "Select…",
    className,
    triggerLabelMode = "value",
    id,
    "aria-labelledby": ariaLabelledBy,
}: DarkSelectProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxH: 240 });

    const updatePosition = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const minOpen = 120;
        const preferBelow = spaceBelow >= minOpen || spaceBelow >= spaceAbove;
        const maxH = Math.min(280, preferBelow ? spaceBelow : spaceAbove);
        const top = preferBelow
            ? rect.bottom + 4
            : Math.max(8, rect.top - 4 - maxH);

        setCoords({
            top,
            left: rect.left,
            width: rect.width,
            maxH,
        });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;

        const onScrollOrResize = () => updatePosition();
        window.addEventListener("scroll", onScrollOrResize, true);
        window.addEventListener("resize", onScrollOrResize);
        return () => {
            window.removeEventListener("scroll", onScrollOrResize, true);
            window.removeEventListener("resize", onScrollOrResize);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;

        const closeIfOutside = (event: PointerEvent) => {
            const node = event.target as Node;
            if (triggerRef.current?.contains(node) || menuRef.current?.contains(node)) return;
            setOpen(false);
        };

        document.addEventListener("pointerdown", closeIfOutside, true);
        return () => document.removeEventListener("pointerdown", closeIfOutside, true);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
            }
        };

        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [open]);

    const selected = options.find((option) => option.value === value);
    const label =
        triggerLabelMode === "placeholder"
            ? placeholder
            : selected?.label ?? (value === "" ? placeholder : value);

    const menu =
        open &&
        typeof document !== "undefined" &&
        createPortal(
            <div
                ref={menuRef}
                role="listbox"
                id={id ? `${id}-listbox` : undefined}
                className="fixed z-[200] overflow-y-auto overscroll-contain rounded-xl border border-white/12 bg-[#141414] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.85)]"
                style={{
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    maxHeight: coords.maxH,
                }}
            >
                {options.map((option) => (
                    <button
                        key={option.value === "" ? "__empty__" : option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === value}
                        className={cn(
                            "flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                            option.value === value
                                ? "bg-lime-400/15 text-lime-300"
                                : "text-neutral-200 hover:bg-white/8 hover:text-white"
                        )}
                        onClick={() => {
                            onChange(option.value);
                            setOpen(false);
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>,
            document.body
        );

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                id={id}
                aria-labelledby={ariaLabelledBy}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={id ? `${id}-listbox` : undefined}
                onClick={() => setOpen((previous) => !previous)}
                className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-left text-sm font-semibold text-white outline-none transition-all focus:border-lime-400/20 focus:ring-1 focus:ring-lime-400/30",
                    className
                )}
            >
                <span className="min-w-0 truncate">{label}</span>
                <ChevronDown
                    size={16}
                    className={cn(
                        "shrink-0 text-neutral-500 transition-transform",
                        open && "rotate-180"
                    )}
                />
            </button>
            {menu}
        </>
    );
}
