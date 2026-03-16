import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    const initialValueRef = useRef(initialValue);
    initialValueRef.current = initialValue;

    const readValue = useCallback(() => {
        const fallbackValue = initialValueRef.current;

        if (typeof window === "undefined") {
            return fallbackValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : fallbackValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return fallbackValue;
        }
    }, [key]);

    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
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

    useEffect(() => {
        setStoredValue(readValue());
    }, [key, readValue]);

    // Persist to localStorage
    useEffect(() => {
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
