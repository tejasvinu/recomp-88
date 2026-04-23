'use client';

import type React from 'react';
import { Dumbbell, BookOpen, BarChart3, UserCircle2, HeartPulse } from 'lucide-react';
import { cn } from '../utils';

import { useAppStore } from '../store/appStore';

export type TabId = 'workout' | 'stretching' | 'wiki' | 'charts' | 'profile';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'workout', label: 'Tracker', icon: Dumbbell },
    { id: 'stretching', label: 'Recovery', icon: HeartPulse },
    { id: 'wiki', label: 'Wiki', icon: BookOpen },
    { id: 'charts', label: 'Progress', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: UserCircle2 },
];

/**
 * Fixed bottom navigation bar with animated active indicator.
 * Self-contained: reads from and writes to the global store directly.
 */
export default function BottomNav() {
    const activeTab = useAppStore((s) => s.activeTab);
    const onSetTab = useAppStore((s) => s.setActiveTab);
    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-50">
            <div className="pointer-events-auto bg-[#080808]/88 backdrop-blur-2xl border-t border-white/6 shadow-[0_-10px_40px_rgba(0,0,0,0.55)] px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="h-[var(--bottom-nav-height)] flex items-center justify-center">
                    <nav className="grid grid-cols-5 w-full gap-0.5" aria-label="Main navigation">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        onSetTab(id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={cn(
                                        'group relative flex flex-col items-center justify-center gap-[2px] rounded-2xl transition-all duration-200 py-1.5',
                                        'min-h-[52px] min-w-0 select-none outline-none',
                                        'focus-visible:ring-2 focus-visible:ring-lime-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]',
                                        isActive ? 'text-lime-400' : 'text-neutral-600 hover:text-neutral-300',
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <div
                                        className={cn(
                                            'w-9 h-8 flex items-center justify-center rounded-2xl transition-all duration-200 border',
                                            isActive
                                                ? 'bg-lime-400/12 border-lime-400/25 shadow-[0_0_18px_rgba(163,230,53,0.14)]'
                                                : 'border-transparent group-hover:bg-white/4',
                                        )}
                                    >
                                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span
                                        className={cn(
                                            'text-[8px] uppercase font-bold tracking-[0.1em] leading-none transition-colors truncate w-full text-center px-0.5',
                                            isActive ? 'text-lime-400' : 'text-neutral-600 group-hover:text-neutral-400',
                                        )}
                                    >
                                        {label}
                                    </span>
                                    {/* Active indicator line */}
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full transition-opacity',
                                            'bg-lime-400/80 shadow-[0_0_10px_rgba(163,230,53,0.45)]',
                                            isActive ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
}
