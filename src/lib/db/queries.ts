import { createClient } from "@/lib/supabase/server";
import type {
  ExerciseRow,
  SavedWorkout,
  SetTemplateRow,
} from "@/lib/domain/types";
import type { Json, SetType } from "@/lib/supabase/database.types";

/** Exercises + their templates for the chosen day, ordered for the entry flow. */
export async function getExercisesForDay(day: 1 | 2): Promise<{
  exercises: ExerciseRow[];
  templates: SetTemplateRow[];
}> {
  const supabase = await createClient();

  const { data: exercises, error: exErr } = await supabase
    .from("exercises")
    .select("*")
    .eq("split_id", "2day")
    .eq("day", day)
    .eq("is_active", true)
    .order("order_index", { ascending: true });
  if (exErr) throw exErr;

  const ids = (exercises ?? []).map((e) => e.id);
  if (ids.length === 0) return { exercises: [], templates: [] };

  const { data: templates, error: tplErr } = await supabase
    .from("exercise_set_templates")
    .select("*")
    .in("exercise_id", ids)
    .order("order_index", { ascending: true });
  if (tplErr) throw tplErr;

  return { exercises: exercises ?? [], templates: templates ?? [] };
}

/** Workout history list (newest first). */
export async function getWorkoutHistory(): Promise<
  { id: string; day: 1 | 2; splitId: string; createdAt: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, day, split_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    day: w.day as 1 | 2,
    splitId: w.split_id,
    createdAt: w.created_at,
  }));
}

interface JoinedRow {
  id: string;
  day: number;
  split_id: string;
  created_at: string;
  workout_exercises: {
    id: string;
    exercise_id: string;
    order_index: number;
    exercises: { name: string } | null;
    sets: {
      id: string;
      order_index: number;
      reps: number | null;
      weight: number | null;
      is_skipped: boolean;
      set_template_id: string | null;
      exercise_set_templates: { type: SetType } | null;
    }[];
  }[];
}

function joinedToSaved(row: JoinedRow): SavedWorkout {
  return {
    id: row.id,
    day: row.day as 1 | 2,
    splitId: row.split_id,
    createdAt: row.created_at,
    exercises: [...row.workout_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((we) => ({
        id: we.id,
        exerciseId: we.exercise_id,
        exerciseName: we.exercises?.name ?? "",
        orderIndex: we.order_index,
        sets: [...we.sets]
          .sort((a, b) => a.order_index - b.order_index)
          .map((s) => ({
            id: s.id,
            setType: (s.exercise_set_templates?.type ?? "normal") as SetType,
            orderIndex: s.order_index,
            reps: s.reps,
            weight: s.weight,
            isSkipped: s.is_skipped,
          })),
      })),
  };
}

/** Single workout joined with its exercises + sets. */
export async function getWorkoutById(id: string): Promise<SavedWorkout | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `id, day, split_id, created_at,
       workout_exercises (
         id, exercise_id, order_index,
         exercises ( name ),
         sets (
           id, order_index, reps, weight, is_skipped, set_template_id,
           exercise_set_templates ( type )
         )
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return joinedToSaved(data as unknown as JoinedRow);
}

/** Full workout history with joins — used by analytics + warmup anchor lookup.
 *  Newest first. */
export async function getFullWorkoutHistory(): Promise<SavedWorkout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      `id, day, split_id, created_at,
       workout_exercises (
         id, exercise_id, order_index,
         exercises ( name ),
         sets (
           id, order_index, reps, weight, is_skipped, set_template_id,
           exercise_set_templates ( type )
         )
       )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as JoinedRow[]).map(joinedToSaved);
}

export interface SavePayloadSet {
  set_template_id: string | null;
  order_index: number;
  reps: number | null;
  weight: number | null;
  is_skipped: boolean;
}

export interface SavePayloadExercise {
  exercise_id: string;
  order_index: number;
  sets: SavePayloadSet[];
}

export async function saveWorkout(
  day: 1 | 2,
  exercises: SavePayloadExercise[],
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_workout", {
    p_day: day,
    p_exercises: exercises as unknown as Json,
  });
  if (error) throw error;
  return data as string;
}

export interface UpdatePayloadSet {
  id: string;
  reps: number | null;
  weight: number | null;
  is_skipped: boolean;
}

export async function updateWorkoutSets(
  workoutId: string,
  sets: UpdatePayloadSet[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_workout_sets", {
    p_workout_id: workoutId,
    p_sets: sets as unknown as Json,
  });
  if (error) throw error;
}

export async function deleteWorkout(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}
