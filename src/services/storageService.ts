/**
 * Safe localStorage read/write helpers.
 * These are intentionally thin — no React, no side-effects — so they can be
 * called from the Zustand store initialiser (during module evaluation) and
 * from service functions alike.
 */

export function readLocalStorageValue<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        console.error(`[storageService] Failed to read key "${key}"`);
        return fallback;
    }
}

export function writeLocalStorageValue<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
            console.error(`[storageService] Quota exceeded for key "${key}"`);
        } else {
            console.error(`[storageService] Failed to write key "${key}":`, err);
        }
    }
}

export function removeLocalStorageValue(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
}
