'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ChevronDown,
    Dumbbell,
    Flame,
    HeartPulse,
    Search,
    Sparkles,
    Timer,
    Activity
} from 'lucide-react';
import {
    FinisherPrograms,
    PrimerPrograms,
    StretchingPrograms,
    StretchPrograms,
} from '../stretchingData';
import { cn } from '../utils';
import GuidedStretchingSession from './GuidedStretchingSession';
import type { StretchingProgram } from '../types';

const PRIMER_IDS = new Set(PrimerPrograms.map((p) => p.id));
const FINISHER_IDS = new Set(FinisherPrograms.map((p) => p.id));

type RecoveryZone = 'choose' | 'mobility' | 'training';

interface RecoveryTabProps {
    soundEnabled: boolean;
    selectedProgramId: string | null;
    onSelectProgram: (programId: string) => void;
    onCloseProgram: () => void;
}

function programDurationMinutes(program: StretchingProgram) {
    return Math.max(
        1,
        Math.round(program.stretches.reduce((acc, stretch) => acc + stretch.duration, 0) / 60),
    );
}

// Animation variants
const pageVariants = {
    initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.3, ease: 'easeIn' } }
};

const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function StretchingTab({
    soundEnabled,
    selectedProgramId,
    onSelectProgram,
    onCloseProgram,
}: RecoveryTabProps) {
    const [zone, setZone] = useState<RecoveryZone>('choose');
    const [searchMobility, setSearchMobility] = useState('');
    const [searchTraining, setSearchTraining] = useState('');
    const [expandedMobilityId, setExpandedMobilityId] = useState<string | null>(null);

    const selectedProgram =
        StretchingPrograms.find((entry) => entry.id === selectedProgramId) ?? null;

    const handleCloseGuided = useCallback(() => {
        if (selectedProgramId && PRIMER_IDS.has(selectedProgramId)) {
            setZone('training');
        } else if (selectedProgramId && FINISHER_IDS.has(selectedProgramId)) {
            setZone('training');
        } else if (selectedProgramId) {
            setZone('mobility');
        }
        onCloseProgram();
    }, [onCloseProgram, selectedProgramId]);

    useEffect(() => {
        if (selectedProgramId) return;
        setSearchMobility('');
        setSearchTraining('');
        setExpandedMobilityId(null);
    }, [selectedProgramId]);

    const mobilityQuery = searchMobility.trim().toLowerCase();
    const filteredMobility = useMemo(() => {
        if (!mobilityQuery) return StretchPrograms;
        return StretchPrograms.filter((program) => {
            return (
                program.name.toLowerCase().includes(mobilityQuery) ||
                program.focusAreas?.some((area) => area.toLowerCase().includes(mobilityQuery)) ||
                program.bestFor?.some((item) => item.toLowerCase().includes(mobilityQuery)) ||
                program.stretches.some(
                    (stretch) =>
                        stretch.name.toLowerCase().includes(mobilityQuery) ||
                        stretch.targetAreas?.some((area) => area.toLowerCase().includes(mobilityQuery)),
                )
            );
        });
    }, [mobilityQuery]);

    const trainingQuery = searchTraining.trim().toLowerCase();
    const filteredPrimers = useMemo(() => {
        if (!trainingQuery) return PrimerPrograms;
        return PrimerPrograms.filter((program) => matchesTrainingQuery(program, trainingQuery));
    }, [trainingQuery]);

    const filteredFinishers = useMemo(() => {
        if (!trainingQuery) return FinisherPrograms;
        return FinisherPrograms.filter((program) => matchesTrainingQuery(program, trainingQuery));
    }, [trainingQuery]);

    if (selectedProgram) {
        return (
            <GuidedStretchingSession
                program={selectedProgram}
                onClose={handleCloseGuided}
                soundEnabled={soundEnabled}
            />
        );
    }

    return (
        <AnimatePresence mode="wait">
            {zone === 'choose' && (
                <motion.div
                    key="choose"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full max-w-3xl mx-auto pb-24 text-zinc-50 font-sans selection:bg-lime-400 selection:text-black px-4 sm:px-0"
                >
                    <header className="pt-8 pb-8 border-b border-white/8 relative">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full blur-[50px] pointer-events-none" />

                        <div className="flex items-center justify-between gap-4 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                                    Recovery
                                </h2>
                                <p className="text-sm text-zinc-400 font-medium mt-2 leading-relaxed max-w-[320px]">
                                    Optimize your body. Choose structured mobility flows or intense training extras.
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-lime-400 shadow-xl">
                                <Activity size={24} />
                            </div>
                        </div>
                    </header>

                    <div className="mt-8 grid gap-4">
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setZone('mobility')}
                            className={cn(
                                'rounded-3xl border text-left p-6 transition-all duration-300 relative overflow-hidden group',
                                'bg-zinc-900/50 border-lime-400/20 hover:border-lime-400/40 hover:bg-zinc-900',
                                'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                            )}
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <HeartPulse size={120} className="text-lime-400 -translate-y-8 translate-x-8" />
                            </div>

                            <div className="flex items-start gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400/20 to-lime-400/5 border border-lime-400/30 flex items-center justify-center text-lime-400 shrink-0 shadow-[0_0_20px_rgba(163,230,53,0.1)] group-hover:shadow-[0_0_30px_rgba(163,230,53,0.2)] transition-shadow">
                                    <HeartPulse size={26} />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-400/90 mb-1">
                                        Mobility & stretching
                                    </p>
                                    <h3 className="text-xl font-black text-white tracking-tight">
                                        Holds, flows, & cooldowns
                                    </h3>
                                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-[90%]">
                                        Static stretches and slow flows for after training, tight days, or general flexibility.
                                    </p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-[11px] font-bold text-lime-300">
                                            {StretchPrograms.length} routines
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setZone('training')}
                            className={cn(
                                'rounded-3xl border text-left p-6 transition-all duration-300 relative overflow-hidden group',
                                'bg-zinc-900/50 border-amber-400/20 hover:border-amber-400/40 hover:bg-zinc-900',
                                'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                            )}
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity size={120} className="text-amber-400 -translate-y-8 translate-x-8" />
                            </div>

                            <div className="flex items-start gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-rose-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(251,191,36,0.1)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-500">
                                    <Dumbbell size={26} className="rotate-[-12deg] group-hover:rotate-0 transition-transform duration-500" />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/90 mb-1">
                                        Training extras
                                    </p>
                                    <h3 className="text-xl font-black text-white tracking-tight">
                                        Primers & finishers
                                    </h3>
                                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-[90%]">
                                        Short, higher-effort blocks meant around your main lifts — not replacement stretching.
                                    </p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-[11px] font-bold text-amber-300">
                                            {PrimerPrograms.length} primers
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-[11px] font-bold text-rose-300">
                                            {FinisherPrograms.length} finishers
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {zone === 'mobility' && (
                <motion.div
                    key="mobility"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full max-w-3xl mx-auto pb-24 text-zinc-50 font-sans selection:bg-lime-400 selection:text-black px-4 sm:px-0"
                >
                    <header className="pt-4 pb-6 border-b border-white/8 sticky top-0 bg-[#080808]/95 backdrop-blur-xl z-20">
                        <button
                            type="button"
                            onClick={() => {
                                setZone('choose');
                                setSearchMobility('');
                                setExpandedMobilityId(null);
                            }}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back to Recovery
                        </button>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-lime-300">
                                    Mobility Flows
                                </h2>
                                <p className="text-sm text-zinc-400 font-medium mt-1">
                                    Stretching and slow movement — search by muscle or goal.
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
                                <HeartPulse size={20} />
                            </div>
                        </div>
                        <div className="relative mt-6">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Search routines, muscles, goals…"
                                value={searchMobility}
                                onChange={(event) => setSearchMobility(event.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-[15px] font-medium text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/40 transition-all shadow-inner"
                            />
                        </div>
                    </header>

                    <section className="py-6">
                        {filteredMobility.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <motion.ul
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="grid gap-3 list-none p-0 m-0"
                            >
                                {filteredMobility.map((program) => (
                                    <motion.li key={program.id} variants={itemVariants}>
                                        <MobilityProgramRow
                                            program={program}
                                            expanded={expandedMobilityId === program.id}
                                            onToggleExpand={() =>
                                                setExpandedMobilityId((current) =>
                                                    current === program.id ? null : program.id,
                                                )
                                            }
                                            onStart={() => onSelectProgram(program.id)}
                                        />
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                    </section>
                </motion.div>
            )}

            {zone === 'training' && (
                <motion.div
                    key="training"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full max-w-3xl mx-auto pb-24 text-zinc-50 font-sans selection:bg-amber-400 selection:text-black px-4 sm:px-0"
                >
                    <header className="pt-4 pb-6 border-b border-white/8 sticky top-0 bg-[#080808]/95 backdrop-blur-xl z-20">
                        <button
                            type="button"
                            onClick={() => {
                                setZone('choose');
                                setSearchTraining('');
                            }}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back to Recovery
                        </button>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-white">
                                    Training Extras
                                </h2>
                                <p className="text-sm text-zinc-400 font-medium mt-1 max-w-[340px] leading-relaxed">
                                    Primers go before heavy work. Finishers empty the tank after.
                                </p>
                            </div>
                        </div>
                        <div className="relative mt-6">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Search primers and finishers…"
                                value={searchTraining}
                                onChange={(event) => setSearchTraining(event.target.value)}
                                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-[15px] font-medium text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/40 transition-all shadow-inner"
                            />
                        </div>
                    </header>

                    <section className="py-6 space-y-10">
                        <div>
                            <div className="flex items-center gap-2.5 mb-4 px-1">
                                <Sparkles size={18} className="text-amber-400" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                                    Primers
                                </h3>
                                <span className="text-[11px] text-zinc-500 font-medium">— before lifting</span>
                            </div>
                            {filteredPrimers.length === 0 ? (
                                <p className="text-sm text-zinc-500 py-4 px-1">No primers match that search.</p>
                            ) : (
                                <motion.ul
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="grid gap-3 list-none p-0 m-0"
                                >
                                    {filteredPrimers.map((program) => (
                                        <motion.li key={program.id} variants={itemVariants}>
                                            <TrainingProgramRow
                                                program={program}
                                                variant="primer"
                                                onStart={() => onSelectProgram(program.id)}
                                            />
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            )}
                        </div>

                        <div className="border-t border-white/8 pt-8">
                            <div className="flex items-center gap-2.5 mb-4 px-1">
                                <Flame size={18} className="text-rose-400" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-300">
                                    Finishers
                                </h3>
                                <span className="text-[11px] text-zinc-500 font-medium">— short burnouts</span>
                            </div>
                            {filteredFinishers.length === 0 ? (
                                <p className="text-sm text-zinc-500 py-4 px-1">No finishers match that search.</p>
                            ) : (
                                <motion.ul
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="grid gap-3 list-none p-0 m-0"
                                >
                                    {filteredFinishers.map((program) => (
                                        <motion.li key={program.id} variants={itemVariants}>
                                            <TrainingProgramRow
                                                program={program}
                                                variant="finisher"
                                                onStart={() => onSelectProgram(program.id)}
                                            />
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            )}
                        </div>
                    </section>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function matchesTrainingQuery(program: StretchingProgram, query: string) {
    return (
        program.name.toLowerCase().includes(query) ||
        program.focusAreas?.some((area) => area.toLowerCase().includes(query)) ||
        program.bestFor?.some((item) => item.toLowerCase().includes(query)) ||
        program.stretches.some(
            (stretch) =>
                stretch.name.toLowerCase().includes(query) ||
                stretch.targetAreas?.some((area) => area.toLowerCase().includes(query)),
        )
    );
}

function EmptyState() {
    return (
        <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center bg-zinc-900/30">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                <Search size={24} />
            </div>
            <p className="text-base font-bold text-zinc-300">No routines match.</p>
            <p className="text-sm text-zinc-500 mt-1.5">Try searching for a specific muscle group or goal.</p>
        </div>
    );
}

function MobilityProgramRow({
    program,
    expanded,
    onToggleExpand,
    onStart,
}: {
    program: StretchingProgram;
    expanded: boolean;
    onToggleExpand: () => void;
    onStart: () => void;
}) {
    const minutes = programDurationMinutes(program);
    const moveCount = program.stretches.length;

    return (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden transition-colors hover:border-white/20">
            <div className="p-4 sm:p-5 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-white tracking-tight leading-snug">
                        {program.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-bold text-zinc-300">
                            {moveCount} moves
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-bold text-zinc-300">
                            ~{minutes} min
                        </span>
                        {program.difficulty && (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-bold text-zinc-400 border border-zinc-700">
                                {program.difficulty}
                            </span>
                        )}
                    </div>
                    {program.focusAreas && program.focusAreas.length > 0 && (
                        <p className="text-xs text-zinc-400 mt-3 leading-relaxed line-clamp-2">
                            <span className="font-semibold text-zinc-300">Focus: </span>
                            {program.focusAreas.slice(0, 4).join(' · ')}
                        </p>
                    )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onStart}
                        className={cn(
                            'flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5',
                            'text-xs font-black uppercase tracking-[0.1em]',
                            'text-lime-300 bg-lime-400/10 border-lime-400/20 hover:bg-lime-400/20 hover:border-lime-400/30 transition-all active:scale-95 shadow-sm',
                        )}
                    >
                        <Timer size={14} />
                        Start
                    </button>
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className={cn(
                            'flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded-lg',
                            'text-zinc-400 hover:text-white py-1.5 transition-colors hover:bg-white/5',
                        )}
                    >
                        {expanded ? 'Hide' : 'Moves'}
                        <ChevronDown
                            size={14}
                            className={cn('transition-transform duration-300', expanded && 'rotate-180')}
                        />
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-black/40 overflow-hidden"
                    >
                        <div className="px-4 py-4 sm:px-5">
                            <ol className="space-y-2.5 m-0 p-0 list-decimal list-inside marker:text-zinc-600 text-sm text-zinc-400">
                                {program.stretches.map((stretch) => (
                                    <li key={stretch.id} className="pl-1">
                                        <span className="text-zinc-200 font-medium">{stretch.name}</span>
                                        <span className="text-zinc-500 font-mono text-xs ml-2 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                                            {stretch.duration}s
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TrainingProgramRow({
    program,
    variant,
    onStart,
}: {
    program: StretchingProgram;
    variant: 'primer' | 'finisher';
    onStart: () => void;
}) {
    const minutes = programDurationMinutes(program);
    const moveCount = program.stretches.length;
    const isPrimer = variant === 'primer';
    const accent = isPrimer
        ? 'text-amber-300 bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20 hover:border-amber-400/30'
        : 'text-rose-300 bg-rose-400/10 border-rose-400/20 hover:bg-rose-400/20 hover:border-rose-400/30';
    const badge = isPrimer ? 'Primer' : 'Finisher';

    return (
        <div
            className={cn(
                'rounded-2xl border px-4 py-4 flex items-center gap-4 transition-colors hover:border-white/20',
                isPrimer ? 'border-amber-400/15 bg-amber-400/5' : 'border-rose-400/15 bg-rose-400/5',
            )}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                        className={cn(
                            'text-[10px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-md border',
                            isPrimer
                                ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                                : 'text-rose-400 border-rose-400/30 bg-rose-400/10',
                        )}
                    >
                        {badge}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium bg-black/20 px-2 py-0.5 rounded-md">
                        {moveCount} stations
                    </span>
                    <span className="text-xs text-zinc-400 font-medium bg-black/20 px-2 py-0.5 rounded-md">
                        ~{minutes} min
                    </span>
                </div>
                <p className="text-base font-black text-white mt-2 tracking-tight truncate">{program.name}</p>
            </div>
            <button
                type="button"
                onClick={onStart}
                className={cn(
                    'shrink-0 rounded-xl border px-5 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition-all active:scale-95 shadow-sm',
                    accent,
                )}
            >
                Start
            </button>
        </div>
    );
}
