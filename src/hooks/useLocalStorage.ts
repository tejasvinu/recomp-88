import { useState, useEffect, useRef } from "react";

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
    const shouldSkipPersistRef = useRef(true);
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        initialValueRef.current = initialValue;
    }, [initialValue]);

    useEffect(() => {
        shouldSkipPersistRef.current = true;
        setStoredValue(readStoredValue(key, initialValueRef.current));
    }, [key]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== key) return;

            if (e.newValue === null) {
                setStoredValue(initialValueRef.current);
                return;
            }

            try {
                setStoredValue(JSON.parse(e.newValue));
            } catch {
                // Ignore parse errors from other tabs
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key]);

    // Persist to localStorage
    useEffect(() => {
        if (typeof window === "undefined") return;

        if (shouldSkipPersistRef.current) {
            shouldSkipPersistRef.current = false;
            return;
        }

        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            if (error instanceof DOMException && error.name === "QuotaExceededError") {
                console.error(
                    `localStorage quota exceeded for key "${key}". Consider clearing old data.`
                );
            } else {
                console.error(`Error writing localStorage key "${key}":`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue] as const;
}
