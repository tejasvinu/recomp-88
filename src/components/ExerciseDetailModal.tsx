'use client';

import { useState } from "react";
import {
  getFreeWeightAlternatives,
  getMinimalEquipmentAlternatives,
  isFreeWeightFriendly,
  isHomeGymFriendly,
  type ExerciseWiki,
} from "../wikiData";
import { cn } from "../utils";
import { useModalEscape } from "../hooks/useModalEscape";
import {
  X,
  Target,
  AlertTriangle,
  ArrowLeftRight,
  Lightbulb,
  ChevronDown,
  Dumbbell,
  Zap,
  House,
  ListChecks,
  Backpack,
} from "lucide-react";

interface ExerciseDetailModalProps {
  entry: ExerciseWiki;
  onClose: () => void;
}

export default function ExerciseDetailModal({ entry, onClose }: ExerciseDetailModalProps) {
  useModalEscape(onClose);

  const [expandedSection, setExpandedSection] = useState<string | null>("biomechanics");
  const freeWeightAlternatives = getFreeWeightAlternatives(entry);
  const minimalEquipmentAlternatives = getMinimalEquipmentAlternatives(entry);

  const toggle = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const categoryColor: Record<string, string> = {
    Push: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    Pull: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    Legs: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    Core: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "Cardio/Mobility": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  };

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md max-h-[88vh] bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="border-b border-white/6 px-5 pt-5 pb-4">
          {/* Drag pill */}
          <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-black text-white tracking-wide leading-tight">{entry.name}</h2>

              {/* Category + primary muscles */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className={cn("text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full border", categoryColor[entry.category] || "text-neutral-400 bg-neutral-800 border-neutral-700")}>
                  {entry.category}
                </span>
                {entry.muscles.primary.map((m) => (
                  <span key={m} className="text-[9px] uppercase font-black tracking-widest text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-1 rounded-full">
                    {m}
                  </span>
                ))}
              </div>

              {/* Secondary muscles */}
              {entry.muscles.secondary.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] uppercase font-bold text-neutral-600 tracking-widest">Also:</span>
                  {entry.muscles.secondary.map((m) => (
                    <span key={m} className="text-[9px] uppercase font-bold tracking-wider text-neutral-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.difficulty && (
                  <span className="text-[9px] uppercase font-black tracking-widest text-white bg-white/6 border border-white/10 px-2.5 py-1 rounded-full">
                    {entry.difficulty}
                  </span>
                )}
                {isHomeGymFriendly(entry) && (
                  <span className="text-[9px] uppercase font-black tracking-widest text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full">
                    Home Gym Friendly
                  </span>
                )}
                {isFreeWeightFriendly(entry) && (
                  <span className="text-[9px] uppercase font-black tracking-widest text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-1 rounded-full">
                    Free Weight Ready
                  </span>
                )}
                {entry.equipment?.map((item) => (
                  <span
                    key={item}
                    className="text-[9px] uppercase font-black tracking-widest text-neutral-400 bg-black/25 border border-white/8 px-2.5 py-1 rounded-full"
                  >
                    {item.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-all border border-white/7"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 overscroll-contain">
          {entry.youtubeId && (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 mb-2 relative bg-black/50 shrink-0 shadow-lg">
              <iframe
                src={`https://www.youtube.com/embed/${entry.youtubeId}?modestbranding=1&rel=0`}
                title={`${entry.name} Tutorial`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
                allowFullScreen
              />
            </div>
          )}

          <AccordionSection
            id="biomechanics"
            title="Biomechanics"
            icon={<Dumbbell size={14} />}
            isOpen={expandedSection === "biomechanics"}
            onToggle={() => toggle("biomechanics")}
          >
            <p className="text-[13px] text-neutral-300 leading-relaxed font-medium">{entry.biomechanics}</p>
          </AccordionSection>

          <AccordionSection
            id="best-for"
            title="Best For"
            icon={<House size={14} />}
            isOpen={expandedSection === "best-for"}
            onToggle={() => toggle("best-for")}
          >
            <div className="flex flex-wrap gap-2">
              {(entry.bestFor ?? []).map((item) => (
                <span
                  key={item}
                  className="text-[12px] font-bold text-neutral-200 bg-white/6 border border-white/9 px-3 py-1.5 rounded-lg"
                >
                  {item}
                </span>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            id="cues"
            title="Execution Cues"
            icon={<Target size={14} />}
            isOpen={expandedSection === "cues"}
            onToggle={() => toggle("cues")}
          >
            <ol className="flex flex-col gap-2.5 list-none">
              {entry.cues.map((cue, i) => (
                <li key={i} className="flex gap-3 items-start text-[13px] text-neutral-300 leading-relaxed font-medium">
                  <span className="shrink-0 w-5 h-5 rounded-lg bg-lime-400/12 text-lime-400 text-[9px] font-black flex items-center justify-center mt-0.5 border border-lime-400/20">
                    {i + 1}
                  </span>
                  {cue}
                </li>
              ))}
            </ol>
          </AccordionSection>

          <AccordionSection
            id="mistakes"
            title="Common Mistakes"
            icon={<AlertTriangle size={14} />}
            isOpen={expandedSection === "mistakes"}
            onToggle={() => toggle("mistakes")}
            accentColor="text-red-400"
          >
            <ul className="flex flex-col gap-2.5 list-none">
              {entry.commonMistakes.map((mistake, i) => (
                <li key={i} className="flex gap-3 items-start text-[13px] text-neutral-300 leading-relaxed font-medium">
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400/70 mt-[7px]" />
                  {mistake}
                </li>
              ))}
            </ul>
          </AccordionSection>

          <AccordionSection
            id="setup"
            title="Setup Checklist"
            icon={<ListChecks size={14} />}
            isOpen={expandedSection === "setup"}
            onToggle={() => toggle("setup")}
          >
            <ol className="flex flex-col gap-2.5 list-none">
              {(entry.setupChecklist ?? []).map((checkItem, index) => (
                <li key={checkItem} className="flex gap-3 items-start text-[13px] text-neutral-300 leading-relaxed font-medium">
                  <span className="shrink-0 w-5 h-5 rounded-lg bg-white/8 text-white text-[9px] font-black flex items-center justify-center mt-0.5 border border-white/10">
                    {index + 1}
                  </span>
                  {checkItem}
                </li>
              ))}
            </ol>
          </AccordionSection>

          <AccordionSection
            id="alternatives"
            title="Swap & Access Paths"
            icon={<Backpack size={14} />}
            isOpen={expandedSection === "alternatives"}
            onToggle={() => toggle("alternatives")}
          >
            <div className="flex flex-col gap-4">
              {freeWeightAlternatives.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight size={12} className="text-lime-400" />
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-lime-400">
                      Free-Weight Alternatives
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {freeWeightAlternatives.map((alt) => (
                      <span key={alt} className="text-[12px] font-bold text-neutral-200 bg-lime-400/10 border border-lime-400/20 px-3 py-1.5 rounded-lg">
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {minimalEquipmentAlternatives.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <House size={12} className="text-sky-400" />
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-sky-400">
                      Minimal-Equipment Options
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {minimalEquipmentAlternatives.map((alt) => (
                      <span key={alt} className="text-[12px] font-bold text-neutral-200 bg-sky-400/10 border border-sky-400/20 px-3 py-1.5 rounded-lg">
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell size={12} className="text-neutral-400" />
                  <p className="text-[10px] uppercase font-black tracking-[0.18em] text-neutral-500">
                    Broader Swap Library
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.alternatives.map((alt) => (
                    <span key={alt} className="text-[12px] font-bold text-neutral-200 bg-white/6 border border-white/9 px-3 py-1.5 rounded-lg">
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            id="notes"
            title="Recomp Notes"
            icon={<Lightbulb size={14} />}
            isOpen={expandedSection === "notes"}
            onToggle={() => toggle("notes")}
            accentColor="text-lime-400"
          >
            <div className="bg-lime-400/6 border border-lime-400/20 rounded-xl p-4">
              <div className="flex gap-2 items-center mb-2">
                <Zap size={12} className="text-lime-400" />
                <span className="text-[9px] uppercase font-black tracking-[0.2em] text-lime-400">Program Tip</span>
              </div>
              <p className="text-[13px] text-neutral-200 leading-relaxed font-medium">{entry.notes}</p>
            </div>
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}

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
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all duration-200",
      isOpen ? "border-white/[0.1] bg-white/3" : "border-white/5 bg-black/20"
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/4 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={cn(accentColor)}>{icon}</span>
          <span className="text-[12px] font-black text-white uppercase tracking-[0.12em]">{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn("text-neutral-500 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
