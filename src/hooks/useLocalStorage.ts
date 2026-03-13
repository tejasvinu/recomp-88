import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    const readValue = useCallback(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch {
                    // Ignore parse errors from other tabs
                }
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [key]);

    const [storedValue, setStoredValue] = useState<T>(initialValue);

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
