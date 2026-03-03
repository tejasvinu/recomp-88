import { useState } from "react";
import type { ExerciseWiki } from "../wikiData";
import { cn } from "../utils";
import {
    X,
    Target,
    AlertTriangle,
    ArrowLeftRight,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Dumbbell,
    Zap,
} from "lucide-react";

interface ExerciseDetailModalProps {
    entry: ExerciseWiki;
    onClose: () => void;
}

export default function ExerciseDetailModal({ entry, onClose }: ExerciseDetailModalProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>("biomechanics");

    const toggle = (section: string) => {
        setExpandedSection((prev) => (prev === section ? null : section));
    };

    const categoryColor: Record<string, string> = {
        Push: "text-orange-400 bg-orange-400/10 border-orange-400/20",
        Pull: "text-sky-400 bg-sky-400/10 border-sky-400/20",
        Legs: "text-purple-400 bg-purple-400/10 border-purple-400/20",
        "Core": "text-amber-400 bg-amber-400/10 border-amber-400/20",
        "Cardio/Mobility": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md max-h-[85vh] bg-neutral-900 border border-neutral-700 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up"
            >
                {/* Header */}
                <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-5 z-10">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-white tracking-tight leading-tight">{entry.name}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border", categoryColor[entry.category] || "text-neutral-400 bg-neutral-800 border-neutral-700")}>
                                    {entry.category}
                                </span>
                                {entry.muscles.primary.map((m) => (
                                    <span key={m} className="text-[10px] uppercase font-bold tracking-wider text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-1 rounded-full">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 shrink-0 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Secondary muscles */}
                    {entry.muscles.secondary.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="text-[9px] uppercase font-bold text-neutral-500 mr-1 self-center">Also:</span>
                            {entry.muscles.secondary.map((m) => (
                                <span key={m} className="text-[9px] uppercase font-medium tracking-wider text-neutral-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
                                    {m}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 overscroll-contain">
                    {/* Biomechanics */}
                    <AccordionSection
                        id="biomechanics"
                        title="Biomechanics"
                        icon={<Dumbbell size={16} />}
                        isOpen={expandedSection === "biomechanics"}
                        onToggle={() => toggle("biomechanics")}
                    >
                        <p className="text-sm text-neutral-300 leading-relaxed">{entry.biomechanics}</p>
                    </AccordionSection>

                    {/* Execution Cues */}
                    <AccordionSection
                        id="cues"
                        title="Execution Cues"
                        icon={<Target size={16} />}
                        isOpen={expandedSection === "cues"}
                        onToggle={() => toggle("cues")}
                    >
                        <ol className="flex flex-col gap-2.5 list-none">
                            {entry.cues.map((cue, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm text-neutral-300 leading-relaxed">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-lime-400/15 text-lime-400 text-[10px] font-black flex items-center justify-center mt-0.5">
                                        {i + 1}
                                    </span>
                                    {cue}
                                </li>
                            ))}
                        </ol>
                    </AccordionSection>

                    {/* Common Mistakes */}
                    <AccordionSection
                        id="mistakes"
                        title="Common Mistakes"
                        icon={<AlertTriangle size={16} />}
                        isOpen={expandedSection === "mistakes"}
                        onToggle={() => toggle("mistakes")}
                        accentColor="text-red-400"
                    >
                        <ul className="flex flex-col gap-2.5 list-none">
                            {entry.commonMistakes.map((mistake, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm text-neutral-300 leading-relaxed">
                                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 mt-2" />
                                    {mistake}
                                </li>
                            ))}
                        </ul>
                    </AccordionSection>

                    {/* Alternatives */}
                    <AccordionSection
                        id="alternatives"
                        title="Swap Alternatives"
                        icon={<ArrowLeftRight size={16} />}
                        isOpen={expandedSection === "alternatives"}
                        onToggle={() => toggle("alternatives")}
                    >
                        <div className="flex flex-wrap gap-2">
                            {entry.alternatives.map((alt) => (
                                <span key={alt} className="text-xs font-bold text-white bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg">
                                    {alt}
                                </span>
                            ))}
                        </div>
                    </AccordionSection>

                    {/* Coach's Notes */}
                    <AccordionSection
                        id="notes"
                        title="Recomp Notes"
                        icon={<Lightbulb size={16} />}
                        isOpen={expandedSection === "notes"}
                        onToggle={() => toggle("notes")}
                        accentColor="text-lime-400"
                    >
                        <div className="bg-lime-400/5 border border-lime-400/10 rounded-xl p-3.5">
                            <div className="flex gap-2 items-center mb-2">
                                <Zap size={14} className="text-lime-400" />
                                <span className="text-[10px] uppercase font-bold tracking-widest text-lime-400">Program Tip</span>
                            </div>
                            <p className="text-sm text-neutral-300 leading-relaxed">{entry.notes}</p>
                        </div>
                    </AccordionSection>
                </div>
            </div>
        </div>
    );
}

// ─── Accordion Sub-component ──────────────────────────
interface AccordionSectionProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    accentColor?: string;
    children: React.ReactNode;
}

function AccordionSection({ title, icon, isOpen, onToggle, accentColor = "text-lime-400", children }: AccordionSectionProps) {
    return (
        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-800/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className={accentColor}>{icon}</span>
                    <span className="text-sm font-bold text-white uppercase tracking-wide">{title}</span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300",
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="px-3.5 pb-4">{children}</div>
            </div>
        </div>
    );
}
