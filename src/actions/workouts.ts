"use server";

import { revalidatePath } from "next/cache";
import { deleteWorkout, saveWorkout, updateWorkoutSets } from "@/lib/db/queries";
import type {
  SavePayloadExercise,
  UpdatePayloadSet,
} from "@/lib/db/queries";

export async function deleteWorkoutAction(id: string) {
  try {
    await deleteWorkout(id);
    revalidatePath("/workouts");
    revalidatePath("/analytics");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete workout" };
  }
}

export async function saveWorkoutAction(
  day: 1 | 2,
  exercises: SavePayloadExercise[],
): Promise<{ id?: string; error?: string }> {
  try {
    const id = await saveWorkout(day, exercises);
    revalidatePath("/workouts");
    revalidatePath("/analytics");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save workout" };
  }
}

export async function updateWorkoutAction(
  workoutId: string,
  sets: UpdatePayloadSet[],
): Promise<{ ok?: true; error?: string }> {
  try {
    await updateWorkoutSets(workoutId, sets);
    revalidatePath(`/workouts/${workoutId}`);
    revalidatePath("/workouts");
    revalidatePath("/analytics");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update workout" };
  }
}
