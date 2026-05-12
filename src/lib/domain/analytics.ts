import type { SavedSet, SavedWorkout } from "./types";

/** Epley 1RM estimate. Returns null when inputs can't produce a meaningful value. */
export function estimate1RM(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps < 1) return null;
  return weight * (1 + reps / 30);
}

/** Sum of weight × reps across non-skipped sets. */
export function calculateVolume(sets: SavedSet[]): number {
  return sets.reduce((acc, s) => {
    if (s.isSkipped || s.weight == null || s.reps == null) return acc;
    return acc + s.weight * s.reps;
  }, 0);
}

/** Pick the "top-set" set for an exercise within a workout, per §11.1:
 *  - Squat / Bench / OHP → set with type "top_set" (non-skipped)
 *  - Deadlift           → heaviest non-skipped single
 *  Returns null when no qualifying set exists. */
export function topSetForExercise(
  exerciseName: string,
  sets: SavedSet[],
): SavedSet | null {
  const usable = sets.filter((s) => !s.isSkipped && s.weight != null && s.reps != null);
  if (usable.length === 0) return null;

  if (exerciseName === "Deadlift") {
    return usable.reduce((best, s) => (s.weight! > best.weight! ? s : best));
  }

  return usable.find((s) => s.setType === "top_set") ?? null;
}

export interface AnalyticsPoint {
  date: string;
  value: number;
}

export function buildTopSetSeries(
  exerciseName: string,
  workouts: SavedWorkout[],
): AnalyticsPoint[] {
  return workoutsAscending(workouts)
    .flatMap((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === exerciseName);
      if (!ex) return [];
      const top = topSetForExercise(exerciseName, ex.sets);
      if (!top?.weight) return [];
      return [{ date: w.createdAt, value: top.weight }];
    });
}

export function build1RMSeries(
  exerciseName: string,
  workouts: SavedWorkout[],
): AnalyticsPoint[] {
  return workoutsAscending(workouts)
    .flatMap((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === exerciseName);
      if (!ex) return [];
      const top = topSetForExercise(exerciseName, ex.sets);
      if (!top?.weight || top.reps == null) return [];
      const oneRm = estimate1RM(top.weight, top.reps);
      return oneRm == null ? [] : [{ date: w.createdAt, value: oneRm }];
    });
}

export function buildVolumeSeries(
  exerciseName: string,
  workouts: SavedWorkout[],
): AnalyticsPoint[] {
  return workoutsAscending(workouts)
    .flatMap((w) => {
      const ex = w.exercises.find((e) => e.exerciseName === exerciseName);
      if (!ex) return [];
      const volume = calculateVolume(ex.sets);
      if (volume === 0) return [];
      return [{ date: w.createdAt, value: volume }];
    });
}

function workoutsAscending(workouts: SavedWorkout[]): SavedWorkout[] {
  return [...workouts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
