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
  /** When true, the exercise may be performed bodyweight (null weight). The
   *  most recent *logged* (non-skipped) performance then decides the
   *  suggestion: weighted → carry it forward; bodyweight → no suggestion
   *  (blank). We never dig past a bodyweight performance to an older weighted
   *  one. A fully-skipped session is "no data" and we keep walking back. */
  allowBodyweight?: boolean;
}

/** Suggest a pre-filled weight for a single working set based on the user's
 *  most recent matching performance.
 *
 *  Top-set match priority (stops at the first non-null result):
 *    1. Most recent workout containing this exercise → set with matching
 *       `setType` AND `indexInExercise`, non-skipped, weight > 0.
 *    2. Same workout → ANY non-skipped, weight > 0 set of the matching
 *       `setType` (fallback when the exact index slot was skipped last time).
 *    3. Walk to the next-older workout and repeat.
 *
 *  For grouped sets (`backoff`, `normal`) `indexInExercise` is ignored — all
 *  sets of that type within an exercise share one suggestion: the heaviest
 *  non-skipped weight from the most recent workout. The bump only applies when
 *  EVERY non-skipped set in that group hit `targetRepsMax`.
 *
 *  If the chosen weight earned a bump, add `increment`. Otherwise return as-is.
 *
 *  For `allowBodyweight` exercises the most recent *logged* performance is
 *  authoritative: if it was bodyweight (no weight), return `null` so the field
 *  stays blank rather than resurfacing an older weighted session.
 *
 *  Returns `null` when no prior matching data exists. */
export function getSuggestedWeight({
  exerciseName,
  setType,
  indexInExercise,
  targetRepsMax,
  history,
  increment,
  allowBodyweight = false,
}: SuggestionArgs): number | null {
  const useGroup = setType === "backoff" || setType === "normal";

  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.exerciseName !== exerciseName) continue;

      if (useGroup) {
        const nonSkipped = ex.sets.filter(
          (s) => s.setType === setType && !s.isSkipped,
        );
        const weighted = nonSkipped.filter(
          (s) => s.weight != null && s.weight > 0,
        );
        if (weighted.length === 0) {
          // A logged-but-unweighted performance means "bodyweight" — stop here
          // instead of digging up an older weighted session. A fully-skipped
          // exercise is "no data", so keep walking back.
          if (allowBodyweight && nonSkipped.length > 0) return null;
          continue;
        }

        const base = Math.max(...weighted.map((s) => s.weight as number));
        const allHitTarget = weighted.every(
          (s) => s.reps != null && s.reps >= targetRepsMax,
        );
        const suggested = allHitTarget ? base + increment : base;
        return roundToTenth(suggested);
      }

      const matched =
        pickSet(ex.sets, setType, indexInExercise) ??
        pickSet(ex.sets, setType, null);

      if (!matched) {
        // Same bodyweight rule for single sets: a non-skipped set with no
        // weight is a bodyweight performance → blank, don't walk further back.
        if (
          allowBodyweight &&
          ex.sets.some((s) => s.setType === setType && !s.isSkipped)
        ) {
          return null;
        }
        continue;
      }

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
