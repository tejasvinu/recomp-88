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
    const ignoreSwipeRef = useRef(false);

    const shouldIgnoreSwipe = (target: EventTarget | null) =>
        target instanceof HTMLElement &&
        !!target.closest(
            'input, textarea, select, button, a, [role="button"], [contenteditable="true"]'
        );

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        ignoreSwipeRef.current = shouldIgnoreSwipe(e.target);
        if (ignoreSwipeRef.current) return;

        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (!enabled || ignoreSwipeRef.current) {
                ignoreSwipeRef.current = false;
                return;
            }

            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
                if (dx < 0) onSwipeLeft();
                else onSwipeRight();
            }

            ignoreSwipeRef.current = false;
        },
        [enabled, onSwipeLeft, onSwipeRight, threshold]
    );

    return { handleTouchStart, handleTouchEnd };
}
