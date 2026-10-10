import type { BodyWeightEntry, SessionSet, WeightUnit, WorkoutSession } from "@/types";

export const LB_KG = 0.45359237;
export const roundMetric = (value: number) => Math.round(value * 1000) / 1000;
export function convertMass(value: number, from: WeightUnit, to: WeightUnit): number {
  return from === to ? value : from === "lbs" ? value * LB_KG : value / LB_KG;
}
export function numericLog(value: string): number | null {
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
export function convertWeightLog(value: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to) return value;
  const match = value.trim().match(/^BW(?:([+-])([\d.]+))?$/i);
  if (match) return match[2] ? `BW${match[1]}${roundMetric(convertMass(Number(match[2]), from, to))}` : "BW";
  const number = numericLog(value);
  return number === null ? value : String(roundMetric(convertMass(number, from, to)));
}

export function resolveSetLoad(set: SessionSet, session: WorkoutSession) {
  const unit = set.weightUnit ?? session.weightUnit;
  const bwUnit = session.bodyWeightUnit ?? session.weightUnit;
  const reps = numericLog(set.loggedReps);
  const validReps = reps !== null && Number.isInteger(reps) && reps > 0 ? reps : null;
  const bw = session.bodyWeightSnapshot !== undefined && bwUnit ? convertMass(session.bodyWeightSnapshot, bwUnit, "kg") : null;
  const body = set.loggedWeight.trim().match(/^BW(?:([+-])((?:\d+(?:\.\d+)?|\.\d+)))?$/i);
  const kind = body ? body[1] === "+" ? "bodyweight_added" : body[1] === "-" ? "bodyweight_assisted" : "bodyweight" : "external";
  const offsetKg = body?.[2] && unit ? convertMass(Number(body[2]), unit, "kg") : body && !body[2] ? 0 : null;
  const external = numericLog(set.loggedWeight);
  const loadKg = body ? bw !== null && offsetKg !== null ? Math.max(0, bw + (body[1] === "-" ? -offsetKg : offsetKg)) : null
    : external !== null && unit ? convertMass(external, unit, "kg") : null;
  const eligible = set.completed === true && validReps !== null && loadKg !== null && Number.isFinite(loadKg * validReps);
  return { loadKind: kind, loadKg, reps: validReps, offsetKg, eligible,
    volumeKgReps: eligible ? loadKg * validReps : null,
    estimated1RmKg: eligible && validReps <= 15 && kind === "external" && set.setType !== "warmup" ? loadKg * (1 + validReps / 30) : null };
}

export function sessionVolumeKg(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.reduce((total, set) => {
    const load = resolveSetLoad(set, session);
    return total + (set.setType === "warmup" ? 0 : load.volumeKgReps ?? 0);
  }, 0), 0);
}

export function displaySession(session: WorkoutSession, unit: WeightUnit): WorkoutSession {
  const source = session.weightUnit;
  return { ...session, weightUnit: source ? unit : undefined,
    bodyWeightUnit: session.bodyWeightUnit || source ? unit : undefined,
    bodyWeightSnapshot: session.bodyWeightSnapshot !== undefined && (session.bodyWeightUnit ?? source) ? convertMass(session.bodyWeightSnapshot, (session.bodyWeightUnit ?? source)!, unit) : undefined,
    totalTonnage: session.totalTonnage !== undefined && source ? convertMass(session.totalTonnage, source, unit) : undefined,
    exercises: session.exercises.map(ex => ({ ...ex, sets: ex.sets.map(set => ({ ...set,
      weightUnit: set.weightUnit || source ? unit : undefined,
      loggedWeight: (set.weightUnit ?? source) ? convertWeightLog(set.loggedWeight, (set.weightUnit ?? source)!, unit) : "",
    })) })),
  };
}
export function displayBodyWeight(entry: BodyWeightEntry, unit: WeightUnit): BodyWeightEntry {
  return entry.weightUnit ? { ...entry, weight: convertMass(entry.weight, entry.weightUnit, unit), weightUnit: unit } : entry;
}
