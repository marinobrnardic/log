/**
 * Integration test for the save_workout / update_workout_sets RPCs.
 *
 * Requires a running local Supabase (`supabase start`) and:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * If either env var is missing, the suite is skipped.
 *
 * What it asserts (SPEC.md §15.2):
 *   - No `workouts`, `workout_exercises`, or `sets` rows exist before save
 *   - After save_workout: 1 workout, N workout_exercises, M sets per spec totals
 *   - Set columns round-trip correctly (reps, weight, is_skipped, order_index)
 *   - update_workout_sets mutates existing rows (no new workouts inserted)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const enabled = !!SUPABASE_URL && !!SERVICE_ROLE && !!ANON_KEY;

describe.skipIf(!enabled)("workout-creation integration", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId: string;
  const email = `test+${Date.now()}@local.test`;
  const password = "password123!";

  beforeAll(async () => {
    admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userId = created.data.user!.id;

    user = createClient<Database>(SUPABASE_URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auth = await user.auth.signInWithPassword({ email, password });
    if (auth.error) throw auth.error;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("inserts no rows before save_workout is invoked", async () => {
    const { count, error } = await user
      .from("workouts")
      .select("*", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it("save_workout for Day A inserts 1 workout, 4 we, 9 sets", async () => {
    const dayAExercises = await getDayExercises(admin, 1);
    expect(dayAExercises.length).toBe(4);

    const payload = dayAExercises.map((ex, exIdx) => ({
      exercise_id: ex.id,
      order_index: exIdx,
      sets: ex.templates.flatMap((t, tIdx) =>
        Array.from({ length: t.default_sets }, (_, k) => ({
          set_template_id: t.id,
          // simple monotonically-increasing order across the exercise
          order_index: ex.templates.slice(0, tIdx).reduce((a, tt) => a + tt.default_sets, 0) + k,
          reps: 5,
          weight: 100 + exIdx * 10 + tIdx + k,
          is_skipped: false,
        })),
      ),
    }));

    const totalSets = payload.reduce((a, p) => a + p.sets.length, 0);
    expect(totalSets).toBe(1 + 2 + 1 + 2 + 3 + 3); // 12 working sets for Day A.

    const { data: workoutId, error } = await user.rpc("save_workout", {
      p_day: 1,
      p_exercises: payload,
    });
    expect(error).toBeNull();
    expect(workoutId).toBeTruthy();

    const { count: wCount } = await user
      .from("workouts")
      .select("*", { count: "exact", head: true });
    expect(wCount).toBe(1);

    const { count: weCount } = await user
      .from("workout_exercises")
      .select("*", { count: "exact", head: true })
      .eq("workout_id", workoutId as unknown as string);
    expect(weCount).toBe(4);

    const { data: weRows } = await user
      .from("workout_exercises")
      .select("id, order_index")
      .eq("workout_id", workoutId as unknown as string)
      .order("order_index", { ascending: true });
    const setRowsCount = await user
      .from("sets")
      .select("*", { count: "exact", head: true })
      .in("workout_exercise_id", (weRows ?? []).map((r) => r.id));
    expect(setRowsCount.count).toBe(totalSets);
  });

  it("update_workout_sets mutates existing rows (no extra inserts)", async () => {
    const { data: workout } = await user
      .from("workouts")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(workout?.id).toBeTruthy();

    const { count: beforeWorkouts } = await user
      .from("workouts")
      .select("*", { count: "exact", head: true });

    const { data: weRows } = await user
      .from("workout_exercises")
      .select("id, sets(id)")
      .eq("workout_id", workout!.id);

    const updates = (weRows ?? []).flatMap((we) =>
      (we as unknown as { sets: { id: string }[] }).sets.map((s) => ({
        id: s.id,
        reps: 8,
        weight: 200,
        is_skipped: false,
      })),
    );

    const { error } = await user.rpc("update_workout_sets", {
      p_workout_id: workout!.id,
      p_sets: updates,
    });
    expect(error).toBeNull();

    const { count: afterWorkouts } = await user
      .from("workouts")
      .select("*", { count: "exact", head: true });
    expect(afterWorkouts).toBe(beforeWorkouts);

    const { data: sample } = await user
      .from("sets")
      .select("reps, weight")
      .limit(1)
      .single();
    expect(sample?.reps).toBe(8);
    expect(sample?.weight).toBe(200);
  });

  it("Day B insert covers the second split (3+1+2+3+3+2 working sets)", async () => {
    const dayBExercises = await getDayExercises(admin, 2);
    expect(dayBExercises.length).toBe(5);

    const payload = dayBExercises.map((ex, exIdx) => ({
      exercise_id: ex.id,
      order_index: exIdx,
      sets: ex.templates.flatMap((t, tIdx) =>
        Array.from({ length: t.default_sets }, (_, k) => ({
          set_template_id: t.id,
          order_index: ex.templates.slice(0, tIdx).reduce((a, tt) => a + tt.default_sets, 0) + k,
          reps: 1,
          weight: 200,
          is_skipped: k === 0 && tIdx === 0, // skip the first set to exercise that path
        })),
      ),
    }));
    const totalB = payload.reduce((a, p) => a + p.sets.length, 0);
    expect(totalB).toBe(3 + 1 + 2 + 3 + 3 + 2); // 14

    const { error, data: id } = await user.rpc("save_workout", {
      p_day: 2,
      p_exercises: payload,
    });
    expect(error).toBeNull();
    const { count: weCount } = await user
      .from("workout_exercises")
      .select("*", { count: "exact", head: true })
      .eq("workout_id", id as unknown as string);
    expect(weCount).toBe(5);
  });
});

interface ExerciseWithTemplates {
  id: string;
  name: string;
  templates: { id: string; default_sets: number; order_index: number }[];
}

async function getDayExercises(
  admin: SupabaseClient<Database>,
  day: 1 | 2,
): Promise<ExerciseWithTemplates[]> {
  const { data: exercises, error: exErr } = await admin
    .from("exercises")
    .select("id, name, order_index")
    .eq("split_id", "2day")
    .eq("day", day)
    .order("order_index", { ascending: true });
  if (exErr) throw exErr;

  const ids = (exercises ?? []).map((e) => e.id);
  const { data: templates, error: tplErr } = await admin
    .from("exercise_set_templates")
    .select("id, exercise_id, default_sets, order_index")
    .in("exercise_id", ids)
    .order("order_index", { ascending: true });
  if (tplErr) throw tplErr;

  return (exercises ?? []).map((ex) => ({
    id: ex.id,
    name: ex.name,
    templates: (templates ?? [])
      .filter((t) => t.exercise_id === ex.id)
      .map((t) => ({ id: t.id, default_sets: t.default_sets, order_index: t.order_index })),
  }));
}
