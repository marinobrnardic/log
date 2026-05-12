import type { Database, SetType } from "@/lib/supabase/database.types";

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type SetTemplateRow = Database["public"]["Tables"]["exercise_set_templates"]["Row"];
export type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"];
export type SetRow = Database["public"]["Tables"]["sets"]["Row"];

export type { SetType };

export type DayLabel = "A" | "B";
export const DAY_LABEL: Record<1 | 2, DayLabel> = { 1: "A", 2: "B" };

/** One working set inside an in-progress (or saved) workout. */
export interface WorkingSet {
  /** Unique key within the plan (not the DB id). */
  key: string;
  /** Saved set row id when editing; null in the create flow. */
  setId: string | null;
  exerciseId: string;
  exerciseName: string;
  setTemplateId: string | null;
  setType: SetType;
  /** 1-based label, e.g. "Top Set", "Back-off 1", "Back-off 2", "Set 2". */
  label: string;
  /** Index of this set within its exercise (0-based). */
  indexInExercise: number;
  /** Index of this set in the full ordered plan (0-based). */
  planIndex: number;
  /** Whether this is the first working set of its exercise (drives warmup display). */
  isFirstOfExercise: boolean;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface WorkoutPlan {
  day: 1 | 2;
  workingSets: WorkingSet[];
  /** Total working sets — the `Y` in `Set X / Y`. */
  total: number;
}

export interface SetValue {
  weight: string;
  reps: string;
  isSkipped: boolean;
}

/** Warmup row — guidance only, never stored. */
export interface WarmupSet {
  order: 1 | 2 | 3 | 4;
  weight: number;
  /** Display string for reps ("10-15" or "5", "3", "1"). */
  reps: string;
  rest: string;
}

/** Read-side view: a saved workout joined with its exercises and sets. */
export interface SavedWorkout {
  id: string;
  day: 1 | 2;
  splitId: string;
  createdAt: string;
  exercises: SavedWorkoutExercise[];
}

export interface SavedWorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: SavedSet[];
}

export interface SavedSet {
  id: string;
  setType: SetType;
  orderIndex: number;
  reps: number | null;
  weight: number | null;
  isSkipped: boolean;
}
