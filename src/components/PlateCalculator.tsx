import { useState } from "react";
import { X, Calculator } from "lucide-react";
import { cn } from "../utils";

const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

const BAR_OPTIONS = [
  { label: "20kg", value: 20, desc: "Olympic" },
  { label: "15kg", value: 15, desc: "Women's" },
  { label: "10kg", value: 10, desc: "Training" },
];

const PLATE_STYLES: Record<number, { bg: string; border: string; text: string; heightClass: string }> = {
  25:   { bg: "bg-red-500/80",     border: "border-red-400",     text: "text-white",       heightClass: "h-16" },
  20:   { bg: "bg-sky-500/80",     border: "border-sky-400",     text: "text-white",       heightClass: "h-14" },
  15:   { bg: "bg-yellow-500/80",  border: "border-yellow-400",  text: "text-neutral-900", heightClass: "h-12" },
  10:   { bg: "bg-green-500/80",   border: "border-green-400",   text: "text-white",       heightClass: "h-10" },
  5:    { bg: "bg-neutral-200/80", border: "border-neutral-300", text: "text-neutral-900", heightClass: "h-8"  },
  2.5:  { bg: "bg-neutral-500/80", border: "border-neutral-400", text: "text-white",       heightClass: "h-6"  },
  1.25: { bg: "bg-neutral-700/80", border: "border-neutral-600", text: "text-white",       heightClass: "h-5"  },
};

const PLATE_LABEL: Record<number, string> = {
  25: "25", 20: "20", 15: "15", 10: "10", 5: "5", 2.5: "2.5", 1.25: "1.25",
};

function calculatePlates(targetWeight: number, barWeight: number): number[] {
  const plates: number[] = [];
  let remaining = Math.round(((targetWeight - barWeight) / 2) * 100) / 100;
  if (remaining <= 0) return [];
  for (const plate of AVAILABLE_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining = Math.round((remaining - plate) * 100) / 100;
    }
  }
  return plates;
}

interface PlateCalculatorProps {
  onClose: () => void;
}

export default function PlateCalculator({ onClose }: PlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState("");
  const [barWeight, setBarWeight] = useState(20);

  const target = parseFloat(targetWeight) || 0;
  const plates = target > barWeight ? calculatePlates(target, barWeight) : [];
  const achievable = Math.round((barWeight + plates.reduce((a, p) => a + p, 0) * 2) * 100) / 100;
  const isExact = target > 0 && Math.abs(achievable - target) < 0.01;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[#0e0e0e] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="border-b border-white/6 px-5 pt-5 pb-4 shrink-0">
          <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center">
                <Calculator size={16} className="text-lime-400" />
              </div>
              <h2 className="text-[16px] font-black text-white tracking-wide">Plate Calculator</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-all border border-white/7"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[76vh] overscroll-contain">
          {/* Target weight input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
              Target Weight
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 100"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                onFocus={(e) => e.target.select()}
                autoFocus
                className="w-full bg-white/5 border border-white/8 rounded-xl py-3.5 pl-4 pr-14 text-2xl font-mono font-bold text-white placeholder-neutral-700 outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400/30 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-neutral-500 uppercase tracking-widest">
                kg
              </span>
            </div>
          </div>

          {/* Bar weight selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
              Bar Weight
            </label>
            <div className="flex gap-2">
              {BAR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBarWeight(opt.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-center transition-all duration-200",
                    barWeight === opt.value
                      ? "bg-lime-400 text-neutral-950 border-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]"
                      : "bg-white/4 text-neutral-400 border-white/8 hover:bg-white/8 hover:text-neutral-200"
                  )}
                >
                  <p className="text-[14px] font-black">{opt.label}</p>
                  <p className={cn("text-[9px] font-bold uppercase tracking-wider", barWeight === opt.value ? "text-neutral-700" : "text-neutral-600")}>
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {target > 0 && target <= barWeight && (
            <div className="bg-white/3 border border-white/6 rounded-xl p-4 text-center">
              <p className="text-[12px] text-neutral-400 font-medium">
                Target must be greater than bar weight ({barWeight}kg)
              </p>
            </div>
          )}

          {target > barWeight && (
            <>
              {/* Total indicator */}
              <div className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 border",
                isExact
                  ? "bg-lime-400/8 border-lime-400/25"
                  : "bg-white/3 border-white/6"
              )}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Achievable</p>
                  <p className={cn("text-xl font-mono font-bold tabular-nums mt-0.5", isExact ? "text-lime-400" : "text-white")}>
                    {achievable}<span className="text-[11px] text-neutral-500 ml-1 font-bold uppercase tracking-widest">kg</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Per Side</p>
                  <p className="text-xl font-mono font-bold text-white tabular-nums mt-0.5">
                    {Math.round(plates.reduce((a, p) => a + p, 0) * 10) / 10}<span className="text-[11px] text-neutral-500 ml-1 font-bold uppercase tracking-widest">kg</span>
                  </p>
                </div>
              </div>

              {/* Plates per side list */}
              <div className="bg-white/3 border border-white/6 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                  Plates Per Side
                </p>
                {plates.length === 0 ? (
                  <p className="text-[12px] text-neutral-500 text-center py-1 font-medium">Bar only — no plates needed</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {plates.map((p, i) => {
                      const style = PLATE_STYLES[p] ?? PLATE_STYLES[1.25];
                      return (
                        <div
                          key={i}
                          className={cn(
                            "h-8 flex items-center justify-center rounded-lg border font-mono font-black text-[11px] px-2.5 min-w-[2.5rem]",
                            style.bg, style.border, style.text
                          )}
                        >
                          {PLATE_LABEL[p] ?? p}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Barbell visualization */}
              {plates.length > 0 && (
                <div className="bg-white/3 border border-white/6 rounded-xl p-4 overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">
                    Barbell View
                  </p>
                  <div className="flex items-center justify-center gap-0">
                    {/* Collar left */}
                    <div className="w-1.5 h-6 bg-neutral-400 rounded-l-sm shrink-0" />
                    {/* Left plates (inner → outer, so reversed array) */}
                    <div className="flex items-center flex-row-reverse gap-[2px]">
                      {[...plates].reverse().map((p, i) => {
                        const style = PLATE_STYLES[p] ?? PLATE_STYLES[1.25];
                        return (
                          <div
                            key={`l-${i}`}
                            className={cn("w-3 rounded-sm border shrink-0", style.bg, style.border, style.heightClass)}
                          />
                        );
                      })}
                    </div>
                    {/* Bar */}
                    <div className="w-20 h-2 bg-neutral-500 rounded-full mx-1 shadow-inner shrink-0" />
                    {/* Right plates (inner → outer) */}
                    <div className="flex items-center gap-[2px]">
                      {plates.map((p, i) => {
                        const style = PLATE_STYLES[p] ?? PLATE_STYLES[1.25];
                        return (
                          <div
                            key={`r-${i}`}
                            className={cn("w-3 rounded-sm border shrink-0", style.bg, style.border, style.heightClass)}
                          />
                        );
                      })}
                    </div>
                    {/* Collar right */}
                    <div className="w-1.5 h-6 bg-neutral-400 rounded-r-sm shrink-0" />
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 justify-center">
                    {[...new Set(plates)].map((p) => {
                      const style = PLATE_STYLES[p] ?? PLATE_STYLES[1.25];
                      return (
                        <div key={p} className="flex items-center gap-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-sm border", style.bg, style.border)} />
                          <span className="text-[9px] font-mono font-bold text-neutral-500">{p}kg</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {target === 0 && (
            <div className="bg-white/2 border border-dashed border-white/8 rounded-xl p-6 text-center">
              <p className="text-[12px] text-neutral-500 font-medium leading-relaxed">
                Enter a target weight above to see which plates to load
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
