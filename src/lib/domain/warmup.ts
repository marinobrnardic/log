import type { SavedWorkout, WarmupSet } from "./types";

const BIG_FOUR = new Set(["Squat", "Bench Press", "Overhead Press", "Deadlift"]);

export function qualifiesForWarmup(exerciseName: string): boolean {
  return BIG_FOUR.has(exerciseName);
}

/** Round to nearest 5 kg, with a 20 kg floor (the empty bar). */
export function roundTo5(weight: number): number {
  return Math.max(20, Math.round(weight / 5) * 5);
}

/** Returns the anchor weight ("100% reference") for the warmup math, or null
 *  if no prior data exists for this exercise.
 *
 *  Spec §10:
 *  - Squat / Bench / OHP: weight of the most recent logged top_set.
 *  - Deadlift: implied 1RM = last_working_weight / 0.9.
 *
 *  `history` should be the caller's workouts list (newest first). The function
 *  walks them in order and stops at the first qualifying set. */
export function getAnchorWeight(
  exerciseName: string,
  history: SavedWorkout[],
): number | null {
  if (!qualifiesForWarmup(exerciseName)) return null;

  for (const workout of history) {
    for (const ex of workout.exercises) {
      if (ex.exerciseName !== exerciseName) continue;

      if (exerciseName === "Deadlift") {
        const candidates = ex.sets.filter(
          (s) => !s.isSkipped && s.weight !== null && s.weight > 0,
        );
        if (candidates.length === 0) continue;
        const maxWeight = Math.max(...candidates.map((s) => s.weight as number));
        return maxWeight / 0.9;
      }

      const topSet = ex.sets.find(
        (s) => s.setType === "top_set" && !s.isSkipped && s.weight !== null,
      );
      if (topSet?.weight != null) return topSet.weight;
    }
  }

  return null;
}

/** Generate four warmup sets from an anchor (the "100%" reference). Returns
 *  null when no anchor is available. */
export function getWarmupSets(anchor: number | null): WarmupSet[] | null {
  if (anchor == null) return null;
  return [
    { order: 1, weight: 20,                  reps: "10-15", rest: "no rest" },
    { order: 2, weight: roundTo5(anchor * 0.5), reps: "5",  rest: "1 min" },
    { order: 3, weight: roundTo5(anchor * 0.7), reps: "3",  rest: "1-2 min" },
    { order: 4, weight: roundTo5(anchor * 0.9), reps: "1",  rest: "2 min" },
  ];
}
