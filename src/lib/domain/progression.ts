import type { SavedSet, SavedWorkout, SetType } from "./types";

export const DEFAULT_WEIGHT_INCREMENT = 2.5;
export const ALLOWED_WEIGHT_INCREMENTS = [2.5, 5] as const;
export type WeightIncrement = (typeof ALLOWED_WEIGHT_INCREMENTS)[number];

export function isWeightIncrement(value: number): value is WeightIncrement {
  return (ALLOWED_WEIGHT_INCREMENTS as readonly number[]).includes(value);
}

interface SuggestionArgs {
  exerciseName: string;
  setType: SetType;
  /** 0-based index of this set within its exercise (matches WorkingSet.indexInExercise). */
  indexInExercise: number;
  /** Top of the target rep range for the CURRENT template — drives the bump decision. */
  targetRepsMax: number;
  /** Workout history, newest-first (as returned by getFullWorkoutHistory). */
  history: SavedWorkout[];
  /** User's preferred weight bump in kg (2.5 or 5). */
  increment: number;
}

/** Suggest a pre-filled weight for a single working set based on the user's
 *  most recent matching performance.
 *
 *  Match priority (stops at the first non-null result):
 *    1. Most recent workout containing this exercise → set with matching
 *       `setType` AND `indexInExercise`, non-skipped, weight > 0.
 *    2. Same workout → ANY non-skipped, weight > 0 set of the matching
 *       `setType` (fallback when the exact index slot was skipped last time).
 *    3. Walk to the next-older workout and repeat.
 *
 *  If the matched set's `reps >= targetRepsMax`, bump the weight by `increment`
 *  (the user "earned" the jump). Otherwise return the same weight.
 *
 *  Returns `null` when no prior matching data exists. */
export function getSuggestedWeight({
  exerciseName,
  setType,
  indexInExercise,
  targetRepsMax,
  history,
  increment,
}: SuggestionArgs): number | null {
  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.exerciseName !== exerciseName) continue;

      const matched =
        pickSet(ex.sets, setType, indexInExercise) ??
        pickSet(ex.sets, setType, null);

      if (!matched) continue;

      const base = matched.weight as number; // pickSet guarantees non-null & > 0
      const repsHit = matched.reps != null && matched.reps >= targetRepsMax;
      const suggested = repsHit ? base + increment : base;
      return roundToTenth(suggested);
    }
  }
  return null;
}

function pickSet(
  sets: SavedSet[],
  setType: SetType,
  indexInExercise: number | null,
): SavedSet | null {
  for (const s of sets) {
    if (s.setType !== setType) continue;
    if (s.isSkipped) continue;
    if (s.weight == null || s.weight <= 0) continue;
    if (indexInExercise != null && s.orderIndex !== indexInExercise) continue;
    return s;
  }
  return null;
}

/** Round to one decimal place. Increments are 2.5 or 5 so the result is always
 *  clean, but float arithmetic occasionally produces 102.49999... — this keeps
 *  the input field readable. */
function roundToTenth(weight: number): number {
  return Math.round(weight * 10) / 10;
}
