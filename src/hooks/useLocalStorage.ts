import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";

/** Hydrate from localStorage before useEffect (cloud sync, etc.) runs — avoids races where async sync merges stale default state over real disk data. */
const useIsomorphicLayoutEffect =
    typeof document !== "undefined" ? useLayoutEffect : useEffect;

const readStoredValue = <T,>(key: string, fallbackValue: T): T => {
    if (typeof window === "undefined") {
        return fallbackValue;
    }

    try {
        const item = window.localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : fallbackValue;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return fallbackValue;
    }
};

export function useLocalStorage<T>(key: string, initialValue: T) {
    const initialValueRef = useRef(initialValue);
    const stateRef = useRef(initialValue);
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        initialValueRef.current = initialValue;
    }, [initialValue]);

    useIsomorphicLayoutEffect(() => {
        const val = readStoredValue(key, initialValueRef.current);
        stateRef.current = val;
        setStoredValue(val);
    }, [key]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== key) return;

            if (e.newValue === null) {
                stateRef.current = initialValueRef.current;
                setStoredValue(initialValueRef.current);
                return;
            }

            try {
                const parsed = JSON.parse(e.newValue);
                stateRef.current = parsed;
                setStoredValue(parsed);
            } catch {
                // Ignore parse errors from other tabs
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key]);

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        const next = value instanceof Function ? (value as any)(stateRef.current) : value;
        stateRef.current = next;
        setStoredValue(next);

        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(key, JSON.stringify(next));
            } catch (error) {
                if (error instanceof DOMException && error.name === "QuotaExceededError") {
                    console.error(`localStorage quota exceeded for key "${key}". Consider clearing old data.`);
                } else {
                    console.error(`Error writing localStorage key "${key}":`, error);
                }
            }
        }
    }, [key]);

    return [storedValue, setValue, stateRef] as const;
}
