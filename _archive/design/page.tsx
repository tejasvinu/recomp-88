'use client';

/**
 * Design prototype lab — /design
 *
 * Three living variants of the Recomp 88 UI/UX, all built on the same first
 * principles (dark canvas, lime accent, mobile-first, Barlow Condensed display
 * type, DM Mono numerals). Each renders the same representative slice so the
 * languages can be compared directly:
 *
 *   A — Refined Dark / Crisp Borders  → solid surfaces, hairline borders,
 *       lime as a single sharp accent, strong type hierarchy, restrained motion.
 *   B — Aurora Glass                   → frosted translucent cards, soft aurora
 *       gradients, layered depth, gentle glow, spring motion.
 *   C — Molten Forge (Data-forward)    → warm charcoal canvas, coral-orange
 *       primary, amber-gold achievements, lit-edge stat tiles, gradient CTAs,
 *       floating dock nav. A full reimagining of the data-forward language.
 *
 * This route is isolated and does NOT touch any app code. Safe to delete after
 * a direction is chosen.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    BookOpen,
    Calculator,
    Check,
    ChevronRight,
    Dumbbell,
    Flame,
    HeartPulse,
    Home,
    Play,
    RotateCcw,
    Save,
    Settings,
    TrendingUp,
    UserCircle2,
    Award,
} from 'lucide-react';
import { cn } from '@/utils';

type VariantId = 'A' | 'B' | 'C';

const VARIANTS: { id: VariantId; name: string; tagline: string }[] = [
    { id: 'A', name: 'Refined Dark', tagline: 'Solid surfaces · hairline borders · single sharp accent · restrained motion' },
    { id: 'B', name: 'Aurora Glass', tagline: 'Frosted cards · soft aurora depth · gentle glow · spring motion' },
    { id: 'C', name: 'Molten Forge', tagline: 'Warm charcoal · coral-orange primary · amber-gold achievements · lit-edge tiles · floating dock · gradient CTAs' },
];

// Shared sample data so every variant renders the same story
const SAMPLE = {
    dayName: 'Push Day',
    dayNumber: 1,
    progress: 75,
    tonnage: 4820,
    setsDone: 9,
    setsTotal: 12,
    pr: 120,
    streak: 4,
    exercise: {
        name: 'Barbell Back Squat',
        category: 'Legs',
        target: '4 × 5',
        sets: [
            { id: '1', targetReps: '5', weight: '100', reps: '5', done: true },
            { id: '2', targetReps: '5', weight: '100', reps: '5', done: true },
            { id: '3', targetReps: '5', weight: '102.5', reps: '5', done: true },
            { id: '4', targetReps: '5', weight: '105', reps: '', done: false },
        ],
    },
    days: [1, 2, 3, 4, 5, 6, 7],
    activeDay: 0,
};

const NAV = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tracker', label: 'Tracker', icon: Dumbbell },
    { id: 'recovery', label: 'Recovery', icon: HeartPulse },
    { id: 'wiki', label: 'Wiki', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: UserCircle2 },
] as const;

export default function DesignPage() {
    const [variant, setVariant] = useState<VariantId>('A');

    return (
        <div className="min-h-dvh bg-[#080808] text-neutral-200 font-sans">
            {/* Switcher */}
            <div className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-md mx-auto px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400">
                                Design Lab
                            </p>
                            <h1 className="text-lg font-black text-white">Recomp 88 · UI Prototypes</h1>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600">/design</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 border border-white/8">
                        {VARIANTS.map((v) => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => setVariant(v.id)}
                                className={cn(
                                    'py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all',
                                    variant === v.id
                                        ? 'bg-lime-400 text-neutral-950'
                                        : 'text-neutral-500 hover:text-neutral-300',
                                )}
                            >
                                {v.id}
                            </button>
                        ))}
                    </div>

                    <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500 min-h-[28px]">
                        <span className="font-bold text-neutral-300">{VARIANTS.find((v) => v.id === variant)?.name}:</span>{' '}
                        {VARIANTS.find((v) => v.id === variant)?.tagline}
                    </p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {variant === 'A' && <VariantA key="A" />}
                {variant === 'B' && <VariantB key="B" />}
                {variant === 'C' && <VariantC key="C" />}
            </AnimatePresence>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Variant A — Refined Dark / Crisp Borders
 * Solid surfaces, hairline borders, lime as ONE sharp accent, strong type
 * hierarchy, larger tap targets, fast/restrained motion.
 * ──────────────────────────────────────────────────────────────────────────── */

function VariantA() {
    const { exercise, progress, days, activeDay } = SAMPLE;
    const doneSets = exercise.sets.filter((s) => s.done).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="max-w-md mx-auto min-h-dvh bg-[#0a0a0a] flex flex-col"
        >
            {/* Header — solid, hairline border, no blur */}
            <header className="sticky top-[112px] z-30 bg-[#0a0a0a] border-b border-white/10 px-4 pt-4 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                        <h2 className="text-xl font-black uppercase tracking-[0.1em] text-lime-400">Recomp</h2>
                        <span className="text-xl font-black uppercase tracking-[0.1em] text-white">88</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#121212]">
                            <Play size={11} className="text-lime-400" />
                            <span className="text-[11px] font-mono font-bold tabular-nums text-neutral-200">12:04</span>
                        </div>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-[#121212] text-neutral-400 hover:text-lime-400 transition-colors">
                            <Calculator size={15} />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-[#121212] text-neutral-400 hover:text-neutral-200 transition-colors">
                            <Settings size={15} />
                        </button>
                    </div>
                </div>

                {/* Progress — solid bar, no glow */}
                <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                            className="h-full bg-lime-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums">{progress}%</span>
                </div>

                {/* Day pills — crisp */}
                <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none">
                    {days.map((d, i) => (
                        <button
                            key={d}
                            className={cn(
                                'shrink-0 min-w-9 h-9 px-3 rounded-lg text-[11px] font-bold transition-all border',
                                i === activeDay
                                    ? 'bg-lime-400 text-neutral-950 border-lime-400'
                                    : 'bg-[#121212] text-neutral-500 border-white/10 hover:text-neutral-300',
                            )}
                        >
                            D{d}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 px-4 py-5 flex flex-col gap-5">
                {/* Stat tiles — solid, hairline, big numbers */}
                <section className="grid grid-cols-3 gap-2">
                    <StatTileA label="Tonnage" value="4,820" unit="kg" icon={Flame} />
                    <StatTileA label="Sets" value="9/12" icon={Check} />
                    <StatTileA label="PR" value="120" unit="kg" icon={Award} />
                </section>

                {/* Exercise card — solid, hairline */}
                <section className="rounded-xl border border-white/10 bg-[#121212] overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                        <div>
                            <h3 className="text-[15px] font-bold text-white leading-tight">{exercise.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400">{exercise.category}</span>
                                <span className="text-[10px] text-neutral-600">·</span>
                                <span className="text-[10px] font-mono text-neutral-500">{exercise.target}</span>
                            </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-neutral-400 tabular-nums">
                            {doneSets}/{exercise.sets.length}
                        </span>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[2rem_1fr_1fr_1.25rem] gap-3 px-4 pb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                        <span className="text-right">✓</span>
                    </div>

                    <div className="px-2 pb-2 flex flex-col gap-1">
                        {exercise.sets.map((set, i) => (
                            <SetRowA key={set.id} index={i + 1} set={set} />
                        ))}
                    </div>

                    <button className="w-full py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-lime-400 border-t border-white/8 transition-colors">
                        + Add set
                    </button>
                </section>

                {/* Pill toggle sample */}
                <section>
                    <div className="flex bg-[#121212] rounded-xl p-1 border border-white/10 gap-1">
                        {['Progression', 'Records'].map((label, i) => (
                            <button
                                key={label}
                                className={cn(
                                    'flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all',
                                    i === 0 ? 'bg-lime-400 text-neutral-950' : 'text-neutral-500 hover:text-neutral-300',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Buttons — solid, no glow */}
                <section className="flex flex-col gap-2.5">
                    <button className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-xl bg-lime-400 text-neutral-950 text-[13px] font-black uppercase tracking-widest hover:bg-lime-300 active:scale-[0.98] transition-all">
                        <Save size={16} />
                        Save Workout
                    </button>
                    <button className="w-full min-h-[44px] flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#121212] text-neutral-400 text-[11px] font-bold uppercase tracking-widest hover:text-neutral-200 transition-all">
                        <RotateCcw size={14} />
                        Clear Checkmarks
                    </button>
                </section>

                <p className="text-center text-[10px] text-neutral-700 pb-2">
                    Variant A · solid surfaces · hairline borders · restrained motion
                </p>
            </main>

            <NavA />
        </motion.div>
    );
}

function StatTileA({ label, value, unit, icon: Icon }: { label: string; value: string; unit?: string; icon: React.ElementType }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#121212] px-3 py-3">
            <div className="flex items-center gap-1.5 text-neutral-600 mb-1.5">
                <Icon size={11} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tabular-nums leading-none">{value}</span>
                {unit && <span className="text-[10px] font-mono text-neutral-600">{unit}</span>}
            </div>
        </div>
    );
}

function SetRowA({ index, set }: { index: number; set: { targetReps: string; weight: string; reps: string; done: boolean } }) {
    return (
        <div
            className={cn(
                'grid grid-cols-[2rem_1fr_1fr_1.25rem] gap-3 items-center px-2 py-2.5 rounded-lg transition-colors',
                set.done ? 'bg-lime-400/[0.06]' : 'hover:bg-white/[0.03]',
            )}
        >
            <span className="text-[11px] font-mono font-bold text-neutral-500 tabular-nums">{index}</span>
            <span className="text-[13px] font-mono text-neutral-200 tabular-nums">{set.weight}</span>
            <span className="text-[13px] font-mono text-neutral-200 tabular-nums">{set.reps || set.targetReps}</span>
            <span
                className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center border transition-all',
                    set.done
                        ? 'bg-lime-400 border-lime-400 text-neutral-950'
                        : 'border-white/15 text-transparent',
                )}
            >
                <Check size={12} strokeWidth={3} />
            </span>
        </div>
    );
}

function NavA() {
    const [active, setActive] = useState('tracker');
    return (
        <div className="sticky bottom-0 z-30 bg-[#0a0a0a] border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)]">
            <nav className="grid grid-cols-6 gap-0.5 h-[60px] max-w-md mx-auto">
                {NAV.map(({ id, label, icon: Icon }) => {
                    const isActive = active === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActive(id)}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-1 rounded-lg transition-colors',
                                isActive ? 'text-lime-400' : 'text-neutral-600 hover:text-neutral-400',
                            )}
                        >
                            {isActive && <span className="absolute top-0 h-[2px] w-7 rounded-full bg-lime-400" />}
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[8px] font-bold uppercase tracking-wider">{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Variant B — Aurora Glass
 * Frosted translucent cards, soft aurora gradients, layered depth, gentle glow,
 * spring motion via framer-motion.
 * ──────────────────────────────────────────────────────────────────────────── */

const auroraContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const auroraItem = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 24 } },
};

function VariantB() {
    const { exercise, progress, days, activeDay } = SAMPLE;
    const doneSets = exercise.sets.filter((s) => s.done).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-md mx-auto min-h-dvh flex flex-col relative"
        >
            {/* Aurora background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-lime-400/[0.07] blur-[100px]" />
                <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-indigo-500/[0.06] blur-[100px]" />
                <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-emerald-400/[0.04] blur-[100px]" />
            </div>

            {/* Header — frosted glass */}
            <header className="sticky top-[112px] z-30 bg-[#080808]/70 backdrop-blur-2xl border-b border-white/8 px-4 pt-4 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                        <h2 className="text-xl font-black uppercase tracking-[0.1em] text-lime-400" style={{ textShadow: '0 0 18px rgba(163,230,53,0.35)' }}>
                            Recomp
                        </h2>
                        <span className="text-xl font-black uppercase tracking-[0.1em] text-white/90">88</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
                            <Play size={11} className="text-lime-400" />
                            <span className="text-[11px] font-mono font-bold tabular-nums text-neutral-200">12:04</span>
                        </div>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-neutral-400 hover:text-lime-400 hover:border-lime-400/20 transition-all">
                            <Calculator size={15} />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-neutral-400 hover:text-neutral-200 transition-all">
                            <Settings size={15} />
                        </button>
                    </div>
                </div>

                {/* Progress — gradient with soft glow */}
                <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, #84cc16, #a3e635)',
                                boxShadow: '0 0 10px rgba(163,230,53,0.5)',
                            }}
                        />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums">{progress}%</span>
                </div>

                {/* Day pills — glassy */}
                <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none">
                    {days.map((d, i) => (
                        <button
                            key={d}
                            className={cn(
                                'shrink-0 min-w-9 h-9 px-3 rounded-xl text-[11px] font-bold transition-all border',
                                i === activeDay
                                    ? 'bg-lime-400/15 border-lime-400/30 text-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.2)]'
                                    : 'bg-white/5 border-white/8 text-neutral-500 hover:bg-white/10 hover:text-neutral-300',
                            )}
                        >
                            D{d}
                        </button>
                    ))}
                </div>
            </header>

            <motion.main
                variants={auroraContainer}
                initial="hidden"
                animate="show"
                className="flex-1 px-4 py-5 flex flex-col gap-5 relative"
            >
                {/* Stat tiles — glass */}
                <motion.section variants={auroraItem} className="grid grid-cols-3 gap-2.5">
                    <StatTileB label="Tonnage" value="4,820" unit="kg" icon={Flame} />
                    <StatTileB label="Sets" value="9/12" icon={Check} />
                    <StatTileB label="PR" value="120" unit="kg" icon={Award} />
                </motion.section>

                {/* Exercise card — glass */}
                <motion.section
                    variants={auroraItem}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.3)] overflow-hidden"
                >
                    <div className="flex items-center justify-between px-5 pt-4 pb-3">
                        <div>
                            <h3 className="text-[15px] font-bold text-white leading-tight">{exercise.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-[9px] font-bold uppercase tracking-wider text-lime-300">
                                    {exercise.category}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500">{exercise.target}</span>
                            </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-lime-400 tabular-nums">
                            {doneSets}/{exercise.sets.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-3 px-5 pb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                        <span className="text-right">✓</span>
                    </div>

                    <div className="px-3 pb-3 flex flex-col gap-1">
                        {exercise.sets.map((set, i) => (
                            <SetRowB key={set.id} index={i + 1} set={set} />
                        ))}
                    </div>

                    <button className="w-full py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-lime-300 border-t border-white/8 transition-colors">
                        + Add set
                    </button>
                </motion.section>

                {/* Pill toggle */}
                <motion.section variants={auroraItem}>
                    <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 border border-white/8 gap-1">
                        {['Progression', 'Records'].map((label, i) => (
                            <button
                                key={label}
                                className={cn(
                                    'flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                                    i === 0
                                        ? 'bg-lime-400/15 border border-lime-400/30 text-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.15)]'
                                        : 'text-neutral-500 hover:text-neutral-300',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </motion.section>

                {/* Buttons — glow */}
                <motion.section variants={auroraItem} className="flex flex-col gap-2.5">
                    <button className="w-full min-h-[50px] flex items-center justify-center gap-2.5 rounded-2xl bg-lime-400 text-neutral-950 text-[13px] font-black uppercase tracking-widest hover:bg-lime-300 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(163,230,53,0.35)]">
                        <Save size={16} />
                        Save Workout
                    </button>
                    <button className="w-full min-h-[46px] flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-neutral-400 text-[11px] font-bold uppercase tracking-widest hover:text-neutral-200 transition-all">
                        <RotateCcw size={14} />
                        Clear Checkmarks
                    </button>
                </motion.section>

                <motion.p variants={auroraItem} className="text-center text-[10px] text-neutral-600 pb-2">
                    Variant B · frosted glass · aurora depth · spring motion
                </motion.p>
            </motion.main>

            <NavB />
        </motion.div>
    );
}

function StatTileB({ label, value, unit, icon: Icon }: { label: string; value: string; unit?: string; icon: React.ElementType }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-3 py-3">
            <div className="flex items-center gap-1.5 text-neutral-500 mb-1.5">
                <Icon size={11} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tabular-nums leading-none">{value}</span>
                {unit && <span className="text-[10px] font-mono text-neutral-600">{unit}</span>}
            </div>
        </div>
    );
}

function SetRowB({ index, set }: { index: number; set: { targetReps: string; weight: string; reps: string; done: boolean } }) {
    return (
        <div
            className={cn(
                'grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-3 items-center px-2 py-2.5 rounded-xl transition-all',
                set.done ? 'bg-lime-400/[0.07]' : 'hover:bg-white/[0.04]',
            )}
        >
            <span className="text-[11px] font-mono font-bold text-neutral-500 tabular-nums">{index}</span>
            <span className="text-[13px] font-mono text-neutral-200 tabular-nums">{set.weight}</span>
            <span className="text-[13px] font-mono text-neutral-200 tabular-nums">{set.reps || set.targetReps}</span>
            <span
                className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center border transition-all',
                    set.done
                        ? 'bg-lime-400 border-lime-400 text-neutral-950 shadow-[0_0_10px_rgba(163,230,53,0.4)]'
                        : 'border-white/15 text-transparent',
                )}
            >
                <Check size={12} strokeWidth={3} />
            </span>
        </div>
    );
}

function NavB() {
    const [active, setActive] = useState('tracker');
    return (
        <div className="sticky bottom-0 z-30 bg-[#080808]/80 backdrop-blur-2xl border-t border-white/8 px-2 pb-[env(safe-area-inset-bottom)]">
            <nav className="grid grid-cols-6 gap-0.5 h-[60px] max-w-md mx-auto">
                {NAV.map(({ id, label, icon: Icon }) => {
                    const isActive = active === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActive(id)}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all',
                                isActive ? 'text-lime-300' : 'text-neutral-600 hover:text-neutral-400',
                            )}
                        >
                            <div
                                className={cn(
                                    'w-9 h-8 flex items-center justify-center rounded-2xl border transition-all',
                                    isActive
                                        ? 'bg-lime-400/12 border-lime-400/25 shadow-[0_0_18px_rgba(163,230,53,0.14)]'
                                        : 'border-transparent',
                                )}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[8px] font-bold uppercase tracking-wider">{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Variant C — Molten Forge (Data-forward reimagining)
 * Warm charcoal canvas, coral-orange primary (#ff5e3a), amber-gold (#fbbf24)
 * for achievements, warm stone text tones, lit-edge stat tiles, gradient CTAs,
 * floating dock nav with sliding pill. Keeps C's data-forward DNA.
 * ──────────────────────────────────────────────────────────────────────────── */

const CORAL = '#ff5e3a';
const CORAL_LIGHT = '#ff8c42';
const GOLD = '#fbbf24';
const INK = '#0a0807';      // warm near-black canvas
const SURFACE = '#16110e';   // warm charcoal surface
const SURFACE_2 = '#1e1814'; // elevated warm surface
const WARM_WHITE = '#f5f0eb';
const WARM_MUTED = '#a8a29e';
const WARM_DIM = '#78716c';

function VariantC() {
    const { exercise, progress, tonnage, setsDone, setsTotal, pr, streak, days, activeDay } = SAMPLE;
    const doneSets = exercise.sets.filter((s) => s.done).length;
    const ringR = 26;
    const ringC = 2 * Math.PI * ringR;
    const ringOffset = ringC * (1 - progress / 100);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="max-w-md mx-auto min-h-dvh flex flex-col relative"
            style={{ backgroundColor: INK }}
        >
            {/* Warm radial glow at top */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 420px 320px at 50% 0%, ${CORAL}14, transparent 70%)`,
                }}
            />

            {/* Header */}
            <header
                className="sticky top-[112px] z-30 px-4 pt-4 pb-3 border-b"
                style={{ backgroundColor: `${INK}f2`, borderColor: `${CORAL}14`, backdropFilter: 'blur(12px)' }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                        <h2 className="text-xl font-black uppercase tracking-[0.06em]" style={{ color: CORAL }}>
                            Recomp
                        </h2>
                        <span className="text-xl font-black uppercase tracking-[0.06em]" style={{ color: WARM_WHITE }}>88</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                            style={{ borderColor: `${CORAL}33`, backgroundColor: `${CORAL}0d` }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{ backgroundColor: CORAL, boxShadow: `0 0 8px ${CORAL}` }}
                            />
                            <span className="text-[13px] font-mono font-bold tabular-nums" style={{ color: CORAL }}>
                                12:04
                            </span>
                        </div>
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors"
                            style={{ borderColor: '#ffffff14', backgroundColor: SURFACE, color: WARM_MUTED }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = CORAL; e.currentTarget.style.borderColor = `${CORAL}33`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = WARM_MUTED; e.currentTarget.style.borderColor = '#ffffff14'; }}
                        >
                            <Calculator size={15} />
                        </button>
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors"
                            style={{ borderColor: '#ffffff14', backgroundColor: SURFACE, color: WARM_MUTED }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = WARM_WHITE; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = WARM_MUTED; }}
                        >
                            <Settings size={15} />
                        </button>
                    </div>
                </div>

                {/* Ring + session progress */}
                <div className="flex items-center gap-4 mt-4">
                    <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r={ringR} fill="none" stroke="#ffffff12" strokeWidth="5" />
                            <circle
                                cx="32"
                                cy="32"
                                r={ringR}
                                fill="none"
                                stroke={CORAL}
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={ringC}
                                strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${CORAL}66)` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black font-mono tabular-nums" style={{ color: WARM_WHITE }}>
                                {progress}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: WARM_DIM }}>
                            Session progress
                        </p>
                        <p className="text-[13px] font-bold mt-0.5" style={{ color: WARM_WHITE }}>
                            {setsDone} of {setsTotal} sets complete
                        </p>
                        <div className="flex gap-1 mt-2">
                            {days.map((d, i) => (
                                <div
                                    key={d}
                                    className="h-1.5 flex-1 rounded-full transition-colors"
                                    style={{
                                        backgroundColor:
                                            i < activeDay ? CORAL : i === activeDay ? `${CORAL}80` : '#ffffff14',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Day pills */}
                <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none">
                    {days.map((d, i) => (
                        <button
                            key={d}
                            className="shrink-0 min-w-9 h-8 px-3 rounded-lg text-[11px] font-bold transition-all"
                            style={
                                i === activeDay
                                    ? { backgroundColor: CORAL, color: INK, boxShadow: `0 0 16px ${CORAL}55` }
                                    : { backgroundColor: SURFACE, color: WARM_MUTED, border: '1px solid #ffffff14' }
                            }
                        >
                            D{d}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 px-4 py-5 flex flex-col gap-5 relative">
                {/* Stat grid 2×2 — lit-edge tiles */}
                <section className="grid grid-cols-2 gap-2.5">
                    <StatTileC label="Tonnage" value={tonnage.toLocaleString()} unit="kg" icon={Flame} accent />
                    <StatTileC label="PR" value={String(pr)} unit="kg" icon={Award} gold />
                    <StatTileC label="Sets" value={`${setsDone}/${setsTotal}`} icon={Check} />
                    <StatTileC label="Streak" value={`${streak}d`} icon={TrendingUp} />
                </section>

                {/* Exercise card — left accent stripe, warm surface */}
                <section
                    className="rounded-xl overflow-hidden relative border"
                    style={{ backgroundColor: SURFACE, borderColor: '#ffffff12' }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: CORAL }} />
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 pl-5">
                        <div>
                            <h3 className="text-[15px] font-bold leading-tight" style={{ color: WARM_WHITE }}>
                                {exercise.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CORAL }}>
                                    {exercise.category}
                                </span>
                                <span className="text-[10px]" style={{ color: WARM_DIM }}>·</span>
                                <span className="text-[10px] font-mono" style={{ color: WARM_MUTED }}>{exercise.target}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[20px] font-black font-mono tabular-nums leading-none block" style={{ color: CORAL }}>
                                {doneSets}
                                <span style={{ color: WARM_DIM }}>/{exercise.sets.length}</span>
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: WARM_DIM }}>
                                done
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-[2rem_1fr_1fr_1.25rem] gap-3 px-5 pb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: WARM_DIM }}>
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                        <span className="text-right">✓</span>
                    </div>

                    <div className="px-2 pb-2 flex flex-col gap-1">
                        {exercise.sets.map((set, i) => (
                            <SetRowC key={set.id} index={i + 1} set={set} />
                        ))}
                    </div>

                    <button
                        className="w-full py-3 text-[11px] font-bold uppercase tracking-widest border-t transition-colors"
                        style={{ color: WARM_MUTED, borderColor: '#ffffff10' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = CORAL; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = WARM_MUTED; }}
                    >
                        + Add set
                    </button>
                </section>

                {/* Pill toggle */}
                <section>
                    <div className="flex rounded-lg p-1 gap-1 border" style={{ backgroundColor: SURFACE, borderColor: '#ffffff12' }}>
                        {['Progression', 'Records'].map((label, i) => (
                            <button
                                key={label}
                                className="flex-1 py-2.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all"
                                style={
                                    i === 0
                                        ? { backgroundColor: CORAL, color: INK }
                                        : { color: WARM_MUTED }
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Buttons — gradient primary, warm secondary */}
                <section className="flex flex-col gap-2.5">
                    <button
                        className="w-full min-h-[50px] flex items-center justify-center gap-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest active:scale-[0.98] transition-all"
                        style={{
                            background: `linear-gradient(135deg, ${CORAL}, ${CORAL_LIGHT})`,
                            color: INK,
                            boxShadow: `0 4px 24px ${CORAL}44`,
                        }}
                    >
                        <Save size={16} />
                        Save Workout
                        <ChevronRight size={14} strokeWidth={3} />
                    </button>
                    <button
                        className="w-full min-h-[44px] flex items-center justify-center gap-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all"
                        style={{ borderColor: '#ffffff14', backgroundColor: SURFACE, color: WARM_MUTED }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = WARM_WHITE; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = WARM_MUTED; }}
                    >
                        <RotateCcw size={14} />
                        Clear Checkmarks
                    </button>
                </section>

                <p className="text-center text-[10px] pb-2" style={{ color: WARM_DIM }}>
                    Variant C · Molten Forge · coral on warm charcoal · gold accents
                </p>
            </main>

            <NavC />
        </motion.div>
    );
}

function StatTileC({
    label,
    value,
    unit,
    icon: Icon,
    accent,
    gold,
}: {
    label: string;
    value: string;
    unit?: string;
    icon: React.ElementType;
    accent?: boolean;
    gold?: boolean;
}) {
    const accentColor = gold ? GOLD : accent ? CORAL : WARM_DIM;
    return (
        <div
            className="rounded-xl border px-3.5 py-3 relative overflow-hidden"
            style={{
                backgroundColor: SURFACE,
                borderColor: (gold ? GOLD : accent ? CORAL : '#ffffff') + '22',
            }}
        >
            {/* Lit top edge */}
            <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                    background: `linear-gradient(90deg, transparent, ${gold ? GOLD : accent ? CORAL : '#ffffff'}55, transparent)`,
                }}
            />
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color: accentColor }}>
                <Icon size={11} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span
                    className="text-2xl font-black font-mono tabular-nums leading-none"
                    style={{ color: gold ? GOLD : accent ? CORAL : WARM_WHITE }}
                >
                    {value}
                </span>
                {unit && <span className="text-[10px] font-mono" style={{ color: WARM_DIM }}>{unit}</span>}
            </div>
        </div>
    );
}

function SetRowC({ index, set }: { index: number; set: { targetReps: string; weight: string; reps: string; done: boolean } }) {
    return (
        <div
            className="grid grid-cols-[2rem_1fr_1fr_1.25rem] gap-3 items-center px-3 py-2.5 rounded-lg transition-colors"
            style={{
                backgroundColor: set.done ? `${CORAL}12` : 'transparent',
            }}
        >
            <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: WARM_DIM }}>
                {index}
            </span>
            <span className="text-[14px] font-mono font-bold tabular-nums" style={{ color: set.done ? WARM_WHITE : '#d6d3d1' }}>
                {set.weight}
            </span>
            <span className="text-[14px] font-mono font-bold tabular-nums" style={{ color: set.done ? WARM_WHITE : '#d6d3d1' }}>
                {set.reps || set.targetReps}
            </span>
            <span
                className="w-5 h-5 rounded-[5px] flex items-center justify-center border-2 transition-all"
                style={
                    set.done
                        ? { backgroundColor: CORAL, borderColor: CORAL, color: INK, boxShadow: `0 0 10px ${CORAL}55` }
                        : { borderColor: '#ffffff24', color: 'transparent' }
                }
            >
                <Check size={11} strokeWidth={3.5} />
            </span>
        </div>
    );
}

function NavC() {
    const [active, setActive] = useState('tracker');
    return (
        <div
            className="sticky bottom-0 z-30 px-3 pb-[env(safe-area-inset-bottom)] pt-2"
            style={{ backgroundColor: `${INK}f2`, borderTop: `1px solid ${CORAL}14`, backdropFilter: 'blur(12px)' }}
        >
            <nav className="grid grid-cols-6 gap-1 h-[58px] max-w-md mx-auto rounded-2xl" style={{ backgroundColor: SURFACE_2 }}>
                {NAV.map(({ id, label, icon: Icon }) => {
                    const isActive = active === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActive(id)}
                            className="relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all"
                            style={isActive ? { color: INK } : { color: WARM_DIM }}
                        >
                            {isActive && (
                                <span
                                    className="absolute inset-x-1 top-1 bottom-1 rounded-xl transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${CORAL}, ${CORAL_LIGHT})`,
                                        boxShadow: `0 0 16px ${CORAL}44`,
                                    }}
                                />
                            )}
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="relative" />
                            <span className="text-[8px] font-bold uppercase tracking-wider relative">{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
