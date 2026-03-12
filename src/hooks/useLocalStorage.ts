import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    const readValue = () => {
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
    };

    const [storedValue, setStoredValue] = useState<T>(readValue);

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

    // Cross-tab synchronization
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

    return [storedValue, setStoredValue] as const;
}
