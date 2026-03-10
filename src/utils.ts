import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

import type { BodyWeightEntry } from "./types";

export function getClosestBodyWeight(dateStr: string, entries: BodyWeightEntry[], defaultWeight: number): number {
    if (!entries || entries.length === 0) return defaultWeight;
    const targetDate = new Date(dateStr).getTime();

    let closestEntry = entries[0];
    let minDiff = Infinity;

    for (const entry of entries) {
        const entryTime = new Date(entry.date).getTime();
        // Ignore invalid dates
        if (isNaN(entryTime)) continue;
        const diff = Math.abs(entryTime - targetDate);
        if (diff < minDiff) {
            minDiff = diff;
            closestEntry = entry;
        }
    }
    return closestEntry?.weight || defaultWeight;
}

export function resolveWeight(loggedWeight: string, fallbackBw: number): number {
    if (!loggedWeight) return 0;
    if (loggedWeight.startsWith("BW")) {
        const offsetStr = loggedWeight.replace("BW", "").replace("+", "");
        const offset = offsetStr ? parseFloat(offsetStr) : 0;
        return Math.max(0, fallbackBw + (offset || 0));
    }
    return Math.max(0, parseFloat(loggedWeight) || 0);
}
