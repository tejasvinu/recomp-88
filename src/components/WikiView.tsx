import { useState, useMemo } from "react";
import { WIKI_DATA, type ExerciseWiki } from "../wikiData";
import { cn } from "../utils";
import ExerciseDetailModal from "./ExerciseDetailModal";
import { Search, BookOpen, Filter, ChevronRight } from "lucide-react";

const CATEGORIES = ["All", "Push", "Pull", "Legs", "Cardio/Mobility"] as const;

const categoryColors: Record<string, { badge: string; dot: string }> = {
    Push: { badge: "text-orange-400 bg-orange-400/10 border-orange-400/20", dot: "bg-orange-400" },
    Pull: { badge: "text-sky-400 bg-sky-400/10 border-sky-400/20", dot: "bg-sky-400" },
    Legs: { badge: "text-purple-400 bg-purple-400/10 border-purple-400/20", dot: "bg-purple-400" },
    Core: { badge: "text-amber-400 bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
    "Cardio/Mobility": { badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
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
            {/* Wiki Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center">
                    <BookOpen size={20} className="text-lime-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white tracking-tight">Exercise Wiki</h2>
                    <p className="text-xs text-neutral-500 font-medium">{WIKI_DATA.length} exercises · Tap any for details</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search exercises or muscles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-600 outline-none focus:ring-1 focus:ring-lime-400 focus:border-lime-400 transition-colors"
                />
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <Filter size={14} className="text-neutral-500 shrink-0 mt-2" />
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                            "shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border",
                            activeCategory === cat
                                ? "bg-lime-400 text-neutral-950 border-lime-400"
                                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800"
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
                        <div className="flex items-center gap-2 px-1 mt-2">
                            <span className={cn("w-2 h-2 rounded-full", categoryColors[category]?.dot || "bg-neutral-400")} />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">{category}</h3>
                            <span className="text-[10px] text-neutral-600 font-medium">({exercises.length})</span>
                        </div>

                        {exercises.map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => setSelectedEntry(ex)}
                                className="w-full flex items-center gap-3 p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800/80 hover:border-neutral-700 text-left transition-all duration-200 group"
                            >
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors truncate">{ex.name}</h4>
                                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                        {ex.muscles.primary.join(", ")}
                                    </p>
                                </div>
                                <ChevronRight size={16} className="text-neutral-600 group-hover:text-lime-400 shrink-0 transition-colors" />
                            </button>
                        ))}
                    </div>
                ))
            )}

            {/* Detail Modal */}
            {selectedEntry && (
                <ExerciseDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
            )}
        </div>
    );
}
