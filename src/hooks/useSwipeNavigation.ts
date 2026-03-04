import { useRef, useCallback } from "react";

interface UseSwipeNavigationOptions {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    enabled: boolean;
    threshold?: number;
}

export function useSwipeNavigation({
    onSwipeLeft,
    onSwipeRight,
    enabled,
    threshold = 60,
}: UseSwipeNavigationOptions) {
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (!enabled) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
                if (dx < 0) onSwipeLeft();
                else onSwipeRight();
            }
        },
        [enabled, onSwipeLeft, onSwipeRight, threshold]
    );

    return { handleTouchStart, handleTouchEnd };
}
