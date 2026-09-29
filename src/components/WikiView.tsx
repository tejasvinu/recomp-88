'use client';

import { useState, useMemo } from "react";
import {
  getFreeWeightAlternatives,
  getMinimalEquipmentAlternatives,
  isFreeWeightFriendly,
  isHomeGymFriendly,
  WIKI_DATA,
  type ExerciseWiki,
} from "../wikiData";
import { cn } from "../utils";
import ExerciseDetailModal from "./ExerciseDetailModal";
import { Search, BookOpen, X, ChevronRight } from "lucide-react";

const CATEGORIES = ["All", "Push", "Pull", "Legs", "Core", "Cardio/Mobility"] as const;
const ACCESS_FILTERS = [
  "All",
  "Free Weight",
  "Bodyweight",
  "Home Gym",
  "Minimal Gear",
  "Machine / Cable",
] as const;

const categoryColors: Record<string, { badge: string; bar: string; dot: string }> = {
  Push:             { badge: "text-orange-400 bg-orange-400/10 border-orange-400/20", bar: "bg-orange-400",  dot: "bg-orange-400 shadow-[0_0_6px_theme(colors.orange.400)]" },
  Pull:             { badge: "text-info-400 bg-info-400/10 border-info-400/20",           bar: "bg-info-400",     dot: "bg-info-400 shadow-[0_0_6px_theme(colors.sky.400)]" },
  Legs:             { badge: "text-purple-400 bg-purple-400/10 border-purple-400/20",  bar: "bg-purple-400",  dot: "bg-purple-400 shadow-[0_0_6px_theme(colors.purple.400)]" },
  Core:             { badge: "text-warn-400 bg-warn-400/10 border-warn-400/20",     bar: "bg-warn-400",   dot: "bg-warn-400 shadow-[0_0_6px_theme(colors.amber.400)]" },
  "Cardio/Mobility":{ badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", bar: "bg-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" },
};

export default function WikiView() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeAccess, setActiveAccess] = useState<string>("All");
  const [selectedEntry, setSelectedEntry] = useState<ExerciseWiki | null>(null);

  const filteredExercises = useMemo(() => {
    return WIKI_DATA.filter((ex) => {
      const matchesCategory = activeCategory === "All" || ex.category === activeCategory;
      const lowerSearch = search.toLowerCase();
      const matchesSearch =
        !search ||
        ex.name.toLowerCase().includes(lowerSearch) ||
        ex.muscles.primary.some((muscle) => muscle.toLowerCase().includes(lowerSearch)) ||
        ex.muscles.secondary.some((muscle) => muscle.toLowerCase().includes(lowerSearch)) ||
        ex.alternatives.some((alternative) => alternative.toLowerCase().includes(lowerSearch)) ||
        ex.equipment?.some((equipment) => equipment.toLowerCase().includes(lowerSearch)) ||
        ex.bestFor?.some((goal) => goal.toLowerCase().includes(lowerSearch)) ||
        ex.movementPattern?.toLowerCase().includes(lowerSearch);

      const matchesAccess =
        activeAccess === "All" ||
        (activeAccess === "Free Weight" && isFreeWeightFriendly(ex)) ||
        (activeAccess === "Bodyweight" && ex.equipment?.includes("bodyweight")) ||
        (activeAccess === "Home Gym" && isHomeGymFriendly(ex)) ||
        (activeAccess === "Minimal Gear" && getMinimalEquipmentAlternatives(ex).length > 0) ||
        (activeAccess === "Machine / Cable" &&
          !!ex.equipment?.some((equipment) => equipment === "machine" || equipment === "cable" || equipment === "smith-machine"));

      return matchesCategory && matchesSearch && matchesAccess;
    });
  }, [search, activeCategory, activeAccess]);

  const groupedExercises = useMemo(() => {
    const grouped: Record<string, ExerciseWiki[]> = {};
    filteredExercises.forEach((ex) => {
      if (!grouped[ex.category]) grouped[ex.category] = [];
      grouped[ex.category].push(ex);
    });
    return grouped;
  }, [filteredExercises]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 bg-accent-400/10 border border-accent-400/20 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen size={22} className="text-accent-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">Exercise Wiki</h2>
          <p className="text-caption text-neutral-500 font-medium uppercase tracking-widest">
            {WIKI_DATA.length} exercises · access-aware swaps built in
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search exercises or muscles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/8 rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-accent-400/40 focus:border-accent-400/30 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-lg text-mini font-bold uppercase tracking-widest transition-all duration-200 border whitespace-nowrap",
              activeCategory === cat
                ? "bg-accent-400 text-neutral-950 border-accent-400 shadow-[0_0_10px_color-mix(in_oklab,_var(--color-accent-400)_20%,_transparent)]"
                : "bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
        {ACCESS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveAccess(filter)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-mini font-bold uppercase tracking-widest transition-all duration-200 border whitespace-nowrap",
              activeAccess === filter
                ? "bg-info-400 text-neutral-950 border-info-400 shadow-[0_0_10px_color-mix(in_oklab,_var(--color-info-400)_18%,_transparent)]"
                : "bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      {Object.keys(groupedExercises).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 text-sm font-medium">
            No exercises match the current search and access filters.
          </p>
        </div>
      ) : (
        Object.entries(groupedExercises).map(([category, exercises]) => (
          <div key={category} className="flex flex-col gap-2">
            {/* Category heading */}
            <div className="flex items-center gap-2 px-1 mt-3">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", categoryColors[category]?.dot || "bg-neutral-500")} />
              <h3 className="text-mini font-black uppercase tracking-[0.18em] text-neutral-500">{category}</h3>
              <span className="text-micro text-neutral-700 font-bold bg-white/4 px-1.5 py-0.5 rounded-md border border-white/5 font-mono">
                {exercises.length}
              </span>
            </div>

            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedEntry(ex)}
                className="w-full flex items-center gap-3 bg-neutral-900/40 border border-white/6 rounded-xl hover:bg-white/5 hover:border-white/[0.1] text-left transition-all duration-200 group overflow-hidden"
              >
                {/* Category color accent bar */}
                <div className={cn("w-1 self-stretch shrink-0 rounded-l-xl", categoryColors[category]?.bar || "bg-neutral-700")} />

                <div className="flex-1 min-w-0 py-3 pr-1">
                  <h4 className="text-[14px] font-bold text-neutral-200 group-hover:text-white transition-colors truncate leading-snug">
                    {ex.name}
                  </h4>
                  <p className="text-mini text-neutral-600 font-medium mt-0.5 uppercase tracking-wider truncate">
                    {ex.muscles.primary.join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {isHomeGymFriendly(ex) && (
                      <span className="text-micro uppercase font-black tracking-widest text-info-400 bg-info-400/10 border border-info-400/20 px-2 py-0.5 rounded-full">
                        Home Gym
                      </span>
                    )}
                    {isFreeWeightFriendly(ex) && (
                      <span className="text-micro uppercase font-black tracking-widest text-accent-400 bg-accent-400/10 border border-accent-400/20 px-2 py-0.5 rounded-full">
                        Free Weight
                      </span>
                    )}
                    {getFreeWeightAlternatives(ex).length > 0 && !isFreeWeightFriendly(ex) && (
                      <span className="text-micro uppercase font-black tracking-widest text-warn-400 bg-warn-400/10 border border-warn-400/20 px-2 py-0.5 rounded-full">
                        {getFreeWeightAlternatives(ex).length} swap options
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pr-3">
                  <ChevronRight size={15} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        ))
      )}

      {selectedEntry && (
        <ExerciseDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
