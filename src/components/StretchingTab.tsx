'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Timer,
    Play,
    Activity,
    ChevronDown,
    ArrowRight,
    Search,
    Target,
} from 'lucide-react';
import { StretchingPrograms } from '../stretchingData';
import { cn } from '../utils';
import GuidedStretchingSession from './GuidedStretchingSession';

interface StretchingTabProps {
    soundEnabled: boolean;
    selectedProgramId: string | null;
    onSelectProgram: (programId: string) => void;
    onCloseProgram: () => void;
}

export default function StretchingTab({
    soundEnabled,
    selectedProgramId,
    onSelectProgram,
    onCloseProgram,
}: StretchingTabProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const selectedProgram =
        StretchingPrograms.find((entry) => entry.id === selectedProgramId) ?? null;

    const filteredPrograms = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return StretchingPrograms;

        return StretchingPrograms.filter((program) => {
            return (
                program.name.toLowerCase().includes(query) ||
                program.focusAreas?.some((area) => area.toLowerCase().includes(query)) ||
                program.bestFor?.some((item) => item.toLowerCase().includes(query)) ||
                program.stretches.some(
                    (stretch) =>
                        stretch.name.toLowerCase().includes(query) ||
                        stretch.description?.toLowerCase().includes(query) ||
                        stretch.targetAreas?.some((area) =>
                            area.toLowerCase().includes(query)
                        )
                )
            );
        });
    }, [search]);

    const totalStretchCount = useMemo(
        () =>
            new Set(
                StretchingPrograms.flatMap((program) =>
                    program.stretches.map((stretch) => stretch.name)
                )
            ).size,
        []
    );

    if (selectedProgram) {
        return (
            <GuidedStretchingSession
                program={selectedProgram}
                onClose={onCloseProgram}
                soundEnabled={soundEnabled}
            />
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 24 },
        },
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8 pb-24 text-zinc-50 font-sans selection:bg-lime-400 selection:text-black">
            <header className="space-y-5 border-b border-zinc-800 pb-6 pt-4">
                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-zinc-100 flex items-center gap-3">
                            Recovery<span className="text-lime-400">.</span>
                        </h2>
                        <p className="text-[10px] md:text-xs font-mono text-zinc-500 uppercase tracking-[0.25em]">
                            {StretchingPrograms.length} programs // {totalStretchCount} stretches
                        </p>
                    </div>
                    <div className="hidden sm:flex w-12 h-12 rounded-none bg-zinc-900 border border-zinc-800 items-center justify-center">
                        <Activity className="w-5 h-5 text-lime-400" />
                    </div>
                </div>

                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search recovery goals, focus areas, or stretches..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-lime-400/35 focus:border-lime-400/20 transition-all"
                    />
                </div>
            </header>

            {filteredPrograms.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center bg-zinc-950/50">
                    <p className="text-sm font-bold text-zinc-200 uppercase tracking-[0.18em]">
                        No recovery flows match this search
                    </p>
                    <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
                        Try searching for shoulders, hips, desk, squat, or recovery.
                    </p>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid gap-6"
                >
                    {filteredPrograms.map((program) => {
                        const totalSeconds = program.stretches.reduce(
                            (acc, stretch) => acc + stretch.duration,
                            0
                        );
                        const totalMinutes = Math.round(totalSeconds / 60);
                        const isExpanded = expandedId === program.id;

                        return (
                            <motion.div
                                variants={itemVariants}
                                key={program.id}
                                className={cn(
                                    "group relative bg-[#0a0a0a] border transition-colors duration-300 overflow-hidden rounded-xl shadow-2xl",
                                    isExpanded
                                        ? "border-lime-400/30"
                                        : "border-zinc-800/80 hover:border-zinc-600"
                                )}
                            >
                                <div className="p-6 md:p-8 flex flex-col h-full">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
                                        <div className="flex items-start gap-4">
                                            <div className="shrink-0 w-12 h-12 rounded-lg bg-lime-400/5 border border-lime-400/20 flex items-center justify-center text-lime-400">
                                                <Timer size={22} />
                                            </div>
                                            <div className="flex flex-col justify-center pt-0.5 gap-2">
                                                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-100 group-hover:text-lime-400 transition-colors leading-none m-0">
                                                    {program.name}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                                    <span className="text-zinc-300 font-semibold">
                                                        {program.stretches.length} movements
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                    <span className="text-zinc-300 font-semibold">
                                                        {totalMinutes} min
                                                    </span>
                                                    {program.difficulty && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                            <span className="text-lime-400 font-semibold">
                                                                {program.difficulty}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : program.id)
                                            }
                                            className="shrink-0 self-start flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all active:scale-95"
                                        >
                                            <span>View Details</span>
                                            <ChevronDown
                                                size={14}
                                                className={cn(
                                                    "transition-transform duration-300 text-zinc-500",
                                                    isExpanded && "rotate-180"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {program.focusAreas?.map((area) => (
                                            <span
                                                key={area}
                                                className="text-[9px] uppercase font-black tracking-[0.16em] text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-1 rounded-full"
                                            >
                                                {area}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                                        <div className="rounded-xl border border-white/6 bg-white/3 p-3.5">
                                            <p className="text-[9px] uppercase font-black tracking-[0.18em] text-zinc-500 mb-2">
                                                Best For
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {program.bestFor?.map((item) => (
                                                    <span
                                                        key={item}
                                                        className="text-[10px] font-bold text-zinc-200 bg-black/25 border border-white/8 px-2 py-1 rounded-lg"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-white/6 bg-white/3 p-3.5">
                                            <p className="text-[9px] uppercase font-black tracking-[0.18em] text-zinc-500 mb-2">
                                                Equipment Access
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {program.equipment?.map((item) => (
                                                    <span
                                                        key={item}
                                                        className="text-[10px] font-bold text-zinc-200 bg-black/25 border border-white/8 px-2 py-1 rounded-lg"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    ease: [0.16, 1, 0.3, 1],
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-zinc-800/50 pt-6 pb-4 space-y-3">
                                                    {program.stretches.map((stretch, idx) => (
                                                        <div
                                                            key={`${program.id}-${stretch.id}`}
                                                            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[10px] font-mono text-zinc-600">
                                                                            {(idx + 1)
                                                                                .toString()
                                                                                .padStart(2, "0")}
                                                                        </span>
                                                                        <p className="text-sm font-bold text-zinc-100">
                                                                            {stretch.name}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                                                                        {stretch.description}
                                                                    </p>
                                                                </div>
                                                                <span className="shrink-0 text-[10px] font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-1 rounded">
                                                                    {stretch.duration}s
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                                {stretch.targetAreas?.map((area) => (
                                                                    <span
                                                                        key={area}
                                                                        className="text-[9px] uppercase font-black tracking-[0.14em] text-amber-300 bg-amber-400/10 border border-amber-400/15 px-2 py-1 rounded-full"
                                                                    >
                                                                        {area}
                                                                    </span>
                                                                ))}
                                                                {stretch.equipment?.map((item) => (
                                                                    <span
                                                                        key={item}
                                                                        className="text-[9px] uppercase font-black tracking-[0.14em] text-zinc-400 bg-white/5 border border-white/8 px-2 py-1 rounded-full"
                                                                    >
                                                                        {item}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                                <div className="rounded-lg border border-white/6 bg-black/25 p-3">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Target size={12} className="text-lime-400" />
                                                                        <p className="text-[9px] uppercase font-black tracking-[0.18em] text-lime-400">
                                                                            Key Cues
                                                                        </p>
                                                                    </div>
                                                                    <ul className="space-y-1.5">
                                                                        {(stretch.cues ?? []).slice(0, 2).map((cue) => (
                                                                            <li
                                                                                key={cue}
                                                                                className="text-[11px] text-zinc-300 leading-relaxed"
                                                                            >
                                                                                {cue}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>

                                                                <div className="rounded-lg border border-white/6 bg-black/25 p-3">
                                                                    <p className="text-[9px] uppercase font-black tracking-[0.18em] text-sky-400 mb-2">
                                                                        Why It Helps
                                                                    </p>
                                                                    <ul className="space-y-1.5">
                                                                        {(stretch.benefits ?? []).slice(0, 2).map((benefit) => (
                                                                            <li
                                                                                key={benefit}
                                                                                className="text-[11px] text-zinc-300 leading-relaxed"
                                                                            >
                                                                                {benefit}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>

                                                            {(stretch.regression || stretch.progression) && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                                                    {stretch.regression && (
                                                                        <div className="rounded-lg border border-white/6 bg-black/25 p-3">
                                                                            <p className="text-[9px] uppercase font-black tracking-[0.18em] text-zinc-500 mb-1.5">
                                                                                Easier Option
                                                                            </p>
                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed">
                                                                                {stretch.regression}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {stretch.progression && (
                                                                        <div className="rounded-lg border border-white/6 bg-black/25 p-3">
                                                                            <p className="text-[9px] uppercase font-black tracking-[0.18em] text-zinc-500 mb-1.5">
                                                                                Progression
                                                                            </p>
                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed">
                                                                                {stretch.progression}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="mt-auto pt-2">
                                        <button
                                            onClick={() => onSelectProgram(program.id)}
                                            className="group/btn relative w-full h-14 bg-zinc-50 border-2 border-zinc-50 text-zinc-950 flex items-center justify-between px-6 text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] rounded-lg overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-lime-400 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out" />

                                            <div className="relative z-10 flex items-center gap-3">
                                                <Play size={16} fill="currentColor" />
                                                <span>Initiate Protocol</span>
                                            </div>

                                            <ArrowRight
                                                size={16}
                                                className="relative z-10 opacity-40 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all duration-300"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-6 p-6 md:p-8 bg-zinc-900/40 border-l-2 border-lime-400 rounded-r-xl"
            >
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-lime-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                    System Note // Why Stretch?
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl font-medium">
                    The updated stretch library is designed to work like a recovery wiki: pick a
                    full flow when you want guidance, or search for a mobility bottleneck and use
                    the detailed cards to understand what each drill is doing for you.
                </p>
            </motion.div>
        </div>
    );
}