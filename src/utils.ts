import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { BodyWeightEntry } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const padDatePart = (value: number) => value.toString().padStart(2, "0");

export function toLocalDateKey(value: string | number | Date = new Date()) {
    if (typeof value === "string" && DATE_KEY_PATTERN.test(value)) {
        return value;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

const createLocalDateFromKey = (value: string) => {
    const match = DATE_KEY_PATTERN.exec(value);
    if (!match) return null;

    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
};

const parseLocalDateKey = (value: string) => {
    const date = createLocalDateFromKey(value);
    if (!date) return Number.NaN;

    date.setHours(12, 0, 0, 0);
    return date.getTime();
};

export function shiftLocalDateKey(dateKey: string, offsetDays: number) {
    const date = createLocalDateFromKey(dateKey);
    if (!date) return "";

    date.setDate(date.getDate() + offsetDays);
    return toLocalDateKey(date);
}

export function getClosestBodyWeight(dateStr: string, entries: BodyWeightEntry[], defaultWeight: number): number {
    if (!entries || entries.length === 0) return defaultWeight;
    const targetDate = parseLocalDateKey(toLocalDateKey(dateStr));
    if (isNaN(targetDate)) return defaultWeight;

    let closestWeight: number | null = null;
    let minDiff = Infinity;

    for (const entry of entries) {
        const entryTime = parseLocalDateKey(entry.date);
        // Ignore invalid dates
        if (isNaN(entryTime)) continue;
        const diff = Math.abs(entryTime - targetDate);
        if (diff < minDiff) {
            minDiff = diff;
            closestWeight = entry.weight;
        }
    }
    return closestWeight ?? defaultWeight;
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
