import { useState, useCallback } from "react";

let toastIdCounter = 0;

export interface ToastItem {
    id: number;
    message: string;
    type: "success" | "error";
    undoAction?: () => void;
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback(
        (message: string, type: "success" | "error" = "success", undoAction?: () => void) => {
            const id = ++toastIdCounter;
            setToasts((prev) => [...prev, { id, message, type, undoAction }]);
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
        },
        []
    );

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
}
