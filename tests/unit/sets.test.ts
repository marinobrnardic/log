import { describe, expect, it } from "vitest";
import { buildWorkoutPlan, setLabel } from "@/lib/domain/sets";
import type { ExerciseRow, SetTemplateRow } from "@/lib/domain/types";

const ex = (id: string, name: string, order: number): ExerciseRow => ({
  id,
  name,
  split_id: "2day",
  day: 1,
  order_index: order,
  notes: null,
  is_active: true,
});

const tpl = (
  id: string,
  exerciseId: string,
  type: "top_set" | "backoff" | "normal",
  order: number,
  defaultSets: number,
  min = 5,
  max = 5,
): SetTemplateRow => ({
  id,
  exercise_id: exerciseId,
  type,
  order_index: order,
  target_reps_min: min,
  target_reps_max: max,
  default_sets: defaultSets,
  notes: null,
});

describe("setLabel", () => {
  it("renders type-specific labels", () => {
    expect(setLabel("top_set", 0, 1)).toBe("Top Set");
    expect(setLabel("backoff", 0, 1)).toBe("Back-off");
    expect(setLabel("backoff", 0, 2)).toBe("Back-off 1");
    expect(setLabel("backoff", 1, 2)).toBe("Back-off 2");
    expect(setLabel("normal", 0, 3)).toBe("Set 1");
    expect(setLabel("normal", 2, 3)).toBe("Set 3");
  });
});

describe("buildWorkoutPlan", () => {
  it("matches Day A totals (12 working sets)", () => {
    const exercises = [
      ex("squat", "Squat", 1),
      ex("bench", "Bench Press", 2),
      ex("rdl", "RDL", 3),
      ex("row", "Bent Over Rows", 4),
    ];
    const templates = [
      tpl("t-squat-top", "squat", "top_set", 1, 1, 4, 6),
      tpl("t-squat-bo", "squat", "backoff", 2, 2, 6, 10),
      tpl("t-bench-top", "bench", "top_set", 1, 1, 4, 6),
      tpl("t-bench-bo", "bench", "backoff", 2, 2, 8, 10),
      tpl("t-rdl", "rdl", "normal", 1, 3, 6, 10),
      tpl("t-row", "row", "normal", 1, 3, 8, 10),
    ];

    const plan = buildWorkoutPlan(1, exercises, templates);
    expect(plan.total).toBe(1 + 2 + 1 + 2 + 3 + 3);
    expect(plan.workingSets).toHaveLength(12);
  });

  it("matches Day B totals (14 working sets)", () => {
    const exercises = [
      ex("dead", "Deadlift", 1),
      ex("ohp", "Overhead Press", 2),
      ex("pullup", "Pull-ups", 3),
      ex("dip", "Dips", 4),
      ex("bss", "Bulgarian Split Squats", 5),
    ];
    const templates = [
      tpl("t-dead", "dead", "normal", 1, 3, 1, 1),
      tpl("t-ohp-top", "ohp", "top_set", 1, 1, 4, 6),
      tpl("t-ohp-bo", "ohp", "backoff", 2, 2, 6, 10),
      tpl("t-pullup", "pullup", "normal", 1, 3, 8, 10),
      tpl("t-dip", "dip", "normal", 1, 3, 8, 10),
      tpl("t-bss", "bss", "normal", 1, 2, 8, 10),
    ];

    const plan = buildWorkoutPlan(2, exercises, templates);
    expect(plan.total).toBe(3 + 1 + 2 + 3 + 3 + 2);
    expect(plan.workingSets).toHaveLength(14);
  });

  it("orders sets by exercise.order_index then template.order_index", () => {
    const exercises = [ex("a", "A", 2), ex("b", "B", 1)]; // intentionally reversed
    const templates = [
      tpl("ta", "a", "top_set", 1, 1),
      tpl("tb1", "b", "normal", 2, 1),
      tpl("tb2", "b", "top_set", 1, 1),
    ];
    const plan = buildWorkoutPlan(1, exercises, templates);
    expect(plan.workingSets.map((s) => `${s.exerciseName}:${s.setType}`)).toEqual([
      "B:top_set",
      "B:normal",
      "A:top_set",
    ]);
  });

  it("marks the first set of each exercise as isFirstOfExercise", () => {
    const exercises = [ex("a", "A", 1)];
    const templates = [
      tpl("t1", "a", "top_set", 1, 1),
      tpl("t2", "a", "backoff", 2, 2),
    ];
    const plan = buildWorkoutPlan(1, exercises, templates);
    expect(plan.workingSets.map((s) => s.isFirstOfExercise)).toEqual([true, false, false]);
  });

  it("emits unique keys per working set", () => {
    const exercises = [ex("a", "A", 1)];
    const templates = [tpl("t1", "a", "backoff", 1, 3)];
    const plan = buildWorkoutPlan(1, exercises, templates);
    const keys = plan.workingSets.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
