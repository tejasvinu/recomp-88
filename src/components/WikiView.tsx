import { useState, useMemo } from "react";
import { WIKI_DATA, type ExerciseWiki } from "../wikiData";
import { cn } from "../utils";
import ExerciseDetailModal from "./ExerciseDetailModal";
import { Search, BookOpen, X, ChevronRight } from "lucide-react";

const CATEGORIES = ["All", "Push", "Pull", "Legs", "Core", "Cardio/Mobility"] as const;

const categoryColors: Record<string, { badge: string; bar: string; dot: string }> = {
  Push:             { badge: "text-orange-400 bg-orange-400/10 border-orange-400/20", bar: "bg-orange-400",  dot: "bg-orange-400 shadow-[0_0_6px_theme(colors.orange.400)]" },
  Pull:             { badge: "text-sky-400 bg-sky-400/10 border-sky-400/20",           bar: "bg-sky-400",     dot: "bg-sky-400 shadow-[0_0_6px_theme(colors.sky.400)]" },
  Legs:             { badge: "text-purple-400 bg-purple-400/10 border-purple-400/20",  bar: "bg-purple-400",  dot: "bg-purple-400 shadow-[0_0_6px_theme(colors.purple.400)]" },
  Core:             { badge: "text-amber-400 bg-amber-400/10 border-amber-400/20",     bar: "bg-amber-400",   dot: "bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]" },
  "Cardio/Mobility":{ badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", bar: "bg-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" },
};

export default function WikiView() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedEntry, setSelectedEntry] = useState<ExerciseWiki | null>(null);

  const filteredExercises = useMemo(() => {
    return WIKI_DATA.filter((ex) => {
      const matchesCategory = activeCategory === "All" || ex.category === activeCategory;
      const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.muscles.primary.some((m) => m.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

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
        <div className="w-11 h-11 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen size={22} className="text-lime-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">Exercise Wiki</h2>
          <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-widest">{WIKI_DATA.length} exercises · tap for details</p>
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
          className="w-full bg-white/5 border border-white/8 rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 transition-all"
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
              "shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border whitespace-nowrap",
              activeCategory === cat
                ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]"
                : "bg-white/4 text-neutral-500 border-white/6 hover:bg-white/8 hover:text-neutral-300"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      {Object.keys(groupedExercises).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 text-sm font-medium">No exercises found.</p>
        </div>
      ) : (
        Object.entries(groupedExercises).map(([category, exercises]) => (
          <div key={category} className="flex flex-col gap-2">
            {/* Category heading */}
            <div className="flex items-center gap-2 px-1 mt-3">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", categoryColors[category]?.dot || "bg-neutral-500")} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{category}</h3>
              <span className="text-[9px] text-neutral-700 font-bold bg-white/4 px-1.5 py-0.5 rounded-md border border-white/5 font-mono">
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
                  <p className="text-[10px] text-neutral-600 font-medium mt-0.5 uppercase tracking-wider truncate">
                    {ex.muscles.primary.join(" · ")}
                  </p>
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
