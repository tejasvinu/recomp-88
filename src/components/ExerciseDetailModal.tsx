'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findWikiEntry,
  getFreeWeightAlternatives,
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
  ListChecks,
  ChevronLeft,
  PlayCircle,
  ArrowUpRight,
  MonitorPlay,
} from "lucide-react";

interface ExerciseDetailModalProps {
  entry: ExerciseWiki;
  onClose: () => void;
}

type SectionId =
  | "setup"
  | "cues"
  | "mistakes"
  | "swaps"
  | "video"
  | "biomechanics"
  | "notes";

type SectionTone = "lime" | "sky" | "red" | "amber" | "violet" | "neutral";

const DEFAULT_OPEN_SECTIONS: SectionId[] = ["setup", "cues", "swaps"];

const CATEGORY_BADGES: Record<string, string> = {
  Push: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Pull: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Legs: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Core: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Cardio/Mobility": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const SECTION_TONE_STYLES: Record<SectionTone, string> = {
  lime: "text-lime-400 bg-lime-400/10 border-lime-400/20",
  sky: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  red: "text-red-400 bg-red-400/10 border-red-400/20",
  amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  violet: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  neutral: "text-neutral-300 bg-white/6 border-white/10",
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const formatEquipmentLabel = (item: string) => item.replace(/-/g, " ");

export default function ExerciseDetailModal({ entry, onClose }: ExerciseDetailModalProps) {
  useModalEscape(onClose);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [entryStack, setEntryStack] = useState<ExerciseWiki[]>([entry]);

  const effectiveEntryStack =
    entryStack[0]?.id === entry.id ? entryStack : [entry];

  const currentEntry = effectiveEntryStack[effectiveEntryStack.length - 1] ?? entry;
  const canGoBack = effectiveEntryStack.length > 1;

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frameId = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleTabKey);
      restoreFocusRef.current?.focus();
    };
  }, []);

  const navigateToEntry = (nextEntry: ExerciseWiki) => {
    setEntryStack((prev) => {
      const baseStack = prev[0]?.id === entry.id ? prev : [entry];
      const existingIndex = baseStack.findIndex((stackEntry) => stackEntry.id === nextEntry.id);
      if (existingIndex >= 0) return baseStack.slice(0, existingIndex + 1);
      return [...baseStack, nextEntry];
    });
  };

  const goBack = () => {
    setEntryStack((prev) => {
      const baseStack = prev[0]?.id === entry.id ? prev : [entry];
      return baseStack.length > 1 ? baseStack.slice(0, -1) : baseStack;
    });
  };

  const allAlternativeNames = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...getFreeWeightAlternatives(currentEntry),
          ...(currentEntry.minimalEquipmentAlternatives ?? []),
          ...currentEntry.alternatives,
        ]
          .map((name) => name.trim())
          .filter((name) => name && name !== currentEntry.name)
      )
    );
  }, [currentEntry]);

  const resolvedAlternatives = useMemo(() => {
    const seenIds = new Set<string>();

    return allAlternativeNames.reduce<ExerciseWiki[]>((acc, name) => {
      const resolvedEntry = findWikiEntry(name);
      if (!resolvedEntry || resolvedEntry.id === currentEntry.id || seenIds.has(resolvedEntry.id)) {
        return acc;
      }

      seenIds.add(resolvedEntry.id);
      acc.push(resolvedEntry);
      return acc;
    }, []);
  }, [allAlternativeNames, currentEntry.id]);

  const accessFriendlyAlternatives = useMemo(() => {
    return resolvedAlternatives.filter(
      (alternative) =>
        isHomeGymFriendly(alternative) || isFreeWeightFriendly(alternative)
    );
  }, [resolvedAlternatives]);

  const otherResolvedAlternatives = useMemo(() => {
    const accessFriendlyIds = new Set(accessFriendlyAlternatives.map((alternative) => alternative.id));
    return resolvedAlternatives.filter((alternative) => !accessFriendlyIds.has(alternative.id));
  }, [accessFriendlyAlternatives, resolvedAlternatives]);

  const unresolvedAlternativeNames = useMemo(() => {
    const resolvedNames = new Set(resolvedAlternatives.map((alternative) => alternative.name));
    return allAlternativeNames.filter((name) => !resolvedNames.has(name));
  }, [allAlternativeNames, resolvedAlternatives]);

  return (
    <div
      className="fixed inset-0 z-90 flex items-end justify-center sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/8 bg-[#0e0e0e] shadow-[0_0_60px_rgba(0,0,0,0.9)] animate-slide-up sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
      >
        <div className="sticky top-0 z-20 shrink-0 border-b border-white/6 bg-[#0e0e0e]/95 px-4 pb-4 pt-4 backdrop-blur-xl sm:px-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/12 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {canGoBack && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/6 text-neutral-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                  aria-label="Go back to previous exercise"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-400">
                  {currentEntry.category}
                  {currentEntry.movementPattern
                    ? ` · ${currentEntry.movementPattern}`
                    : ""}
                </p>
                <h2
                  id="exercise-detail-title"
                  className="mt-1 text-[20px] font-black leading-tight text-white sm:text-[22px]"
                >
                  {currentEntry.name}
                </h2>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-neutral-400 sm:text-[13px]">
                  {currentEntry.muscles.primary.join(" · ")}
                </p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/6 text-neutral-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
              aria-label={`Close ${currentEntry.name} details`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <ExerciseDetailContent
          key={currentEntry.id}
          entry={currentEntry}
          accessFriendlyAlternatives={accessFriendlyAlternatives}
          otherResolvedAlternatives={otherResolvedAlternatives}
          unresolvedAlternativeNames={unresolvedAlternativeNames}
          resolvedAlternativeCount={resolvedAlternatives.length}
          onSelectAlternative={navigateToEntry}
        />
      </div>
    </div>
  );
}

function ExerciseDetailContent({
  entry,
  accessFriendlyAlternatives,
  otherResolvedAlternatives,
  unresolvedAlternativeNames,
  resolvedAlternativeCount,
  onSelectAlternative,
}: {
  entry: ExerciseWiki;
  accessFriendlyAlternatives: ExerciseWiki[];
  otherResolvedAlternatives: ExerciseWiki[];
  unresolvedAlternativeNames: string[];
  resolvedAlternativeCount: number;
  onSelectAlternative: (entry: ExerciseWiki) => void;
}) {
  const [openSections, setOpenSections] = useState<SectionId[]>(DEFAULT_OPEN_SECTIONS);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const bestForItems = (entry.bestFor ?? []).slice(0, 4);
  const bestForOverflow = Math.max(0, (entry.bestFor ?? []).length - bestForItems.length);
  const equipmentItems = entry.equipment ?? [];

  const toggleSection = (section: SectionId) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((item) => item !== section)
        : [...prev, section]
    );
  };

  const isSectionOpen = (section: SectionId) => openSections.includes(section);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="flex flex-col gap-4 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-5 sm:pb-[calc(2.25rem+env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                CATEGORY_BADGES[entry.category] ||
                  "border-neutral-700 bg-neutral-800 text-neutral-300"
              )}
            >
              {entry.category}
            </span>
            {entry.difficulty && <DetailPill>{entry.difficulty}</DetailPill>}
            {isFreeWeightFriendly(entry) && (
              <DetailPill className="border-lime-400/20 bg-lime-400/10 text-lime-400">
                Free Weight
              </DetailPill>
            )}
            {isHomeGymFriendly(entry) && (
              <DetailPill className="border-sky-400/20 bg-sky-400/10 text-sky-400">
                Home Gym
              </DetailPill>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Primary Target">
              <p className="text-[14px] font-semibold leading-snug text-white">
                {entry.muscles.primary.join(" · ")}
              </p>
              {entry.muscles.secondary.length > 0 && (
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                  Also hits {entry.muscles.secondary.join(" · ")}
                </p>
              )}
            </InfoBlock>

            <InfoBlock label="Movement Pattern">
              <p className="text-[14px] font-semibold capitalize leading-snug text-white">
                {entry.movementPattern ?? entry.category}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                Use this as your anchor when picking cues and swaps.
              </p>
            </InfoBlock>

            {bestForItems.length > 0 && (
              <InfoBlock label="Best For">
                <div className="flex flex-wrap gap-1.5">
                  {bestForItems.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-semibold capitalize text-neutral-200"
                    >
                      {item}
                    </span>
                  ))}
                  {bestForOverflow > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                      +{bestForOverflow} more
                    </span>
                  )}
                </div>
              </InfoBlock>
            )}

            <InfoBlock label="Equipment + Access">
              <div className="flex flex-wrap gap-1.5">
                {equipmentItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-semibold capitalize text-neutral-300"
                  >
                    {formatEquipmentLabel(item)}
                  </span>
                ))}
              </div>
            </InfoBlock>
          </div>
        </div>

        {!!entry.setupChecklist?.length && (
          <DisclosureSection
            id="setup"
            title="Setup Checklist"
            summary={`${entry.setupChecklist.length} checkpoints before your first hard set.`}
            icon={<ListChecks size={16} />}
            tone="lime"
            isOpen={isSectionOpen("setup")}
            onToggle={() => toggleSection("setup")}
          >
            <ol className="flex list-none flex-col gap-3">
              {entry.setupChecklist.map((checkItem, index) => (
                <li
                  key={checkItem}
                  className="flex items-start gap-3 rounded-xl border border-white/6 bg-black/20 p-3"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/10 text-[11px] font-black text-lime-400">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-neutral-200">
                    {checkItem}
                  </span>
                </li>
              ))}
            </ol>
          </DisclosureSection>
        )}

        {!!entry.cues.length && (
          <DisclosureSection
            id="cues"
            title="Execution Cues"
            summary={`${entry.cues.length} cues to repeat while the set is happening.`}
            icon={<Target size={16} />}
            tone="sky"
            isOpen={isSectionOpen("cues")}
            onToggle={() => toggleSection("cues")}
          >
            <ol className="flex list-none flex-col gap-3">
              {entry.cues.map((cue, index) => (
                <li
                  key={`${entry.id}-cue-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-white/6 bg-black/20 p-3"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10 text-[11px] font-black text-sky-400">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-neutral-200">
                    {cue}
                  </span>
                </li>
              ))}
            </ol>
          </DisclosureSection>
        )}

        {!!entry.commonMistakes.length && (
          <DisclosureSection
            id="mistakes"
            title="Common Mistakes"
            summary={`${entry.commonMistakes.length} pitfalls that usually show up once fatigue hits.`}
            icon={<AlertTriangle size={16} />}
            tone="red"
            isOpen={isSectionOpen("mistakes")}
            onToggle={() => toggleSection("mistakes")}
          >
            <ul className="flex list-none flex-col gap-3">
              {entry.commonMistakes.map((mistake, index) => (
                <li
                  key={`${entry.id}-mistake-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-red-400/10 bg-red-400/4 p-3"
                >
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-red-400/75" />
                  <span className="text-sm font-medium leading-relaxed text-neutral-200">
                    {mistake}
                  </span>
                </li>
              ))}
            </ul>
          </DisclosureSection>
        )}

        {(accessFriendlyAlternatives.length > 0 ||
          otherResolvedAlternatives.length > 0 ||
          unresolvedAlternativeNames.length > 0) && (
          <DisclosureSection
            id="swaps"
            title="Swap Options"
            summary={
              accessFriendlyAlternatives.length > 0
                ? `${accessFriendlyAlternatives.length} access-friendly swaps you can open in place.`
                : `${resolvedAlternativeCount + unresolvedAlternativeNames.length} related swap ideas.`
            }
            icon={<ArrowLeftRight size={16} />}
            tone="lime"
            isOpen={isSectionOpen("swaps")}
            onToggle={() => toggleSection("swaps")}
          >
            <div className="flex flex-col gap-4">
              {accessFriendlyAlternatives.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-400">
                      Access-Friendly Picks
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                      These are the cleanest free-weight or home-gym swaps. Tap one to load its setup and cues.
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {accessFriendlyAlternatives.map((alternative) => (
                      <AlternativeCard
                        key={alternative.id}
                        entry={alternative}
                        onSelect={() => onSelectAlternative(alternative)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherResolvedAlternatives.length > 0 && (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                      More Swaps In The Library
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                      Still valid, but not as access-friendly as the picks above.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {otherResolvedAlternatives.map((alternative) => (
                      <button
                        key={alternative.id}
                        type="button"
                        onClick={() => onSelectAlternative(alternative)}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-left text-[12px] font-semibold text-neutral-200 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                      >
                        <span>{alternative.name}</span>
                        <ArrowUpRight
                          size={13}
                          className="text-neutral-500 transition-colors group-hover:text-neutral-300"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unresolvedAlternativeNames.length > 0 && (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                      More Ideas
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                      These names are kept as references, but they do not have full in-app drill sheets yet.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {unresolvedAlternativeNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[12px] font-semibold text-neutral-400"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DisclosureSection>
        )}

        {entry.youtubeId && (
          <DisclosureSection
            id="video"
            title="Video Demo"
            summary={
              isVideoLoaded
                ? "Tutorial is loaded inline."
                : "Preview first and only load the video if you need it."
            }
            icon={<MonitorPlay size={16} />}
            tone="neutral"
            isOpen={isSectionOpen("video")}
            onToggle={() => toggleSection("video")}
          >
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/30">
              {isVideoLoaded ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${entry.youtubeId}?modestbranding=1&rel=0&autoplay=1`}
                    title={`${entry.name} tutorial`}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVideoLoaded(true)}
                  className="group relative block w-full overflow-hidden text-left"
                  aria-label={`Load tutorial video for ${entry.name}`}
                >
                  <div
                    className="aspect-video bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{
                      backgroundImage: `url(https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/10" />
                  <div className="absolute inset-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-400">
                        Tutorial Video
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        Watch a demo only when you actually need it
                      </p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg">
                      <PlayCircle size={20} />
                    </span>
                  </div>
                </button>
              )}
            </div>
          </DisclosureSection>
        )}

        <DisclosureSection
          id="biomechanics"
          title="Why It Works"
          summary="A deeper explanation of the line of pull, joint action, and training role."
          icon={<Dumbbell size={16} />}
          tone="violet"
          isOpen={isSectionOpen("biomechanics")}
          onToggle={() => toggleSection("biomechanics")}
        >
          <div className="rounded-xl border border-white/6 bg-black/20 p-4">
            <p className="text-sm font-medium leading-relaxed text-neutral-200">
              {entry.biomechanics}
            </p>
          </div>
        </DisclosureSection>

        {!!entry.notes && (
          <DisclosureSection
            id="notes"
            title="Program Notes"
            summary="How it fits the plan, how to progress it, and when to bias it."
            icon={<Lightbulb size={16} />}
            tone="amber"
            isOpen={isSectionOpen("notes")}
            onToggle={() => toggleSection("notes")}
          >
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/6 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Zap size={12} className="text-amber-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                  Programming Note
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-neutral-100">
                {entry.notes}
              </p>
            </div>
          </DisclosureSection>
        )}
      </div>
    </div>
  );
}

interface DisclosureSectionProps {
  id: string;
  title: string;
  summary: string;
  icon: React.ReactNode;
  tone: SectionTone;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function DisclosureSection({
  id,
  title,
  summary,
  icon,
  tone,
  isOpen,
  onToggle,
  children,
}: DisclosureSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border transition-all duration-200",
        isOpen ? "border-white/10 bg-white/5" : "border-white/6 bg-white/2.5"
      )}
    >
      <button
        id={`${id}-button`}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              SECTION_TONE_STYLES[tone]
            )}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase tracking-[0.08em] text-white sm:text-[14px]">
              {title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 sm:text-[12px]">
              {summary}
            </p>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-neutral-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={`${id}-button`}
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-black/20 p-3.5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DetailPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white",
        className
      )}
    >
      {children}
    </span>
  );
}

function AlternativeCard({
  entry,
  onSelect,
}: {
  entry: ExerciseWiki;
  onSelect: () => void;
}) {
  const accessBadges = [
    isFreeWeightFriendly(entry) ? "Free Weight" : null,
    isHomeGymFriendly(entry) ? "Home Gym" : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-2xl border border-white/8 bg-white/4 p-3.5 text-left transition-all hover:border-lime-400/20 hover:bg-lime-400/6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug text-white transition-colors group-hover:text-lime-300">
            {entry.name}
          </p>
          <p className="mt-1 text-[12px] font-medium capitalize leading-relaxed text-neutral-500">
            {entry.movementPattern ?? entry.category}
          </p>
        </div>

        <ArrowUpRight
          size={16}
          className="mt-0.5 shrink-0 text-neutral-500 transition-colors group-hover:text-lime-300"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {accessBadges.map((badge) => (
          <span
            key={`${entry.id}-${badge}`}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
              badge === "Free Weight"
                ? "border-lime-400/20 bg-lime-400/10 text-lime-400"
                : "border-sky-400/20 bg-sky-400/10 text-sky-400"
            )}
          >
            {badge}
          </span>
        ))}

        {(entry.equipment ?? []).slice(0, 2).map((item) => (
          <span
            key={`${entry.id}-${item}`}
            className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-semibold capitalize text-neutral-300"
          >
            {formatEquipmentLabel(item)}
          </span>
        ))}
      </div>
    </button>
  );
}
