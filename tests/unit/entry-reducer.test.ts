import { describe, expect, it } from "vitest";
import {
  canAdvance,
  createInitialState,
  entryReducer,
  type EntryState,
} from "@/lib/entry/reducer";
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

/** Plan with three exercises: squat (2 sets), bench (1 set), row (2 sets). */
function buildDay1State(): EntryState {
  const exercises = [ex("squat", "Squat", 1), ex("bench", "Bench", 2), ex("row", "Row", 3)];
  const templates = [
    tpl("t-squat", "squat", "top_set", 1, 2),
    tpl("t-bench", "bench", "normal", 1, 1),
    tpl("t-row", "row", "normal", 1, 2),
  ];
  return entryReducer(createInitialState(), {
    type: "selectDay",
    day: 1,
    exercises,
    templates,
    history: [],
    weightIncrement: 2.5,
  });
}

describe("entryReducer — baselines", () => {
  it("selectDay builds a plan and stays on the day phase", () => {
    const s = buildDay1State();
    expect(s.phase).toBe("day");
    expect(s.day).toBe(1);
    expect(s.plan?.total).toBe(5);
    expect(s.plan?.workingSets[0].exerciseName).toBe("Squat");
  });

  it("start moves to entry with index 0", () => {
    const s = entryReducer(buildDay1State(), { type: "start" });
    expect(s.phase).toBe("entry");
    expect(s.index).toBe(0);
  });

  it("next advances index; canAdvance gates valid input", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    expect(canAdvance(s)).toBe(false);
    s = entryReducer(s, { type: "setField", field: "weight", value: "60" });
    s = entryReducer(s, { type: "setField", field: "reps", value: "5" });
    expect(canAdvance(s)).toBe(true);
    s = entryReducer(s, { type: "next" });
    expect(s.index).toBe(1);
  });

  it("finishWorkout skips all remaining sets and lands on recap", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    s = entryReducer(s, { type: "finishWorkout" });
    expect(s.phase).toBe("recap");
    for (const ws of s.plan!.workingSets) {
      expect(s.values[ws.key]?.isSkipped).toBe(true);
    }
  });
});

describe("entryReducer — skipExercise", () => {
  it("marks all sets of the current exercise as skipped and jumps to the next exercise", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    // index 0 = Squat set 1
    s = entryReducer(s, { type: "skipExercise" });
    const squatSets = s.plan!.workingSets.filter((ws) => ws.exerciseId === "squat");
    for (const ws of squatSets) {
      expect(s.values[ws.key]?.isSkipped).toBe(true);
    }
    expect(s.plan!.workingSets[s.index].exerciseId).toBe("bench");
    expect(s.dirty).toBe(true);
  });

  it("works when starting from a middle set of the exercise (still skips earlier sets too)", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    // advance to Squat set 2 (index 1)
    s = entryReducer(s, { type: "setField", field: "weight", value: "60" });
    s = entryReducer(s, { type: "setField", field: "reps", value: "5" });
    s = entryReducer(s, { type: "next" });
    expect(s.index).toBe(1);
    s = entryReducer(s, { type: "skipExercise" });
    // Previously entered set 1 is now wiped and skipped.
    const set1 = s.plan!.workingSets[0];
    expect(s.values[set1.key]).toEqual({ weight: "", reps: "", isSkipped: true });
    // Cursor lands on Bench.
    expect(s.plan!.workingSets[s.index].exerciseId).toBe("bench");
  });

  it("lands on recap when skipping the last exercise", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    // jump to first Row set (index 3)
    s = entryReducer(s, { type: "jumpTo", index: 3 });
    expect(s.plan!.workingSets[s.index].exerciseId).toBe("row");
    s = entryReducer(s, { type: "skipExercise" });
    expect(s.phase).toBe("recap");
    const rowSets = s.plan!.workingSets.filter((ws) => ws.exerciseId === "row");
    for (const ws of rowSets) {
      expect(s.values[ws.key]?.isSkipped).toBe(true);
    }
  });

  it("returns to recap and clears returnToRecap when set via edit-from-recap", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    s = entryReducer(s, { type: "jumpTo", index: 2, fromRecap: true });
    expect(s.returnToRecap).toBe(true);
    s = entryReducer(s, { type: "skipExercise" });
    expect(s.phase).toBe("recap");
    expect(s.returnToRecap).toBe(false);
    const benchSets = s.plan!.workingSets.filter((ws) => ws.exerciseId === "bench");
    for (const ws of benchSets) {
      expect(s.values[ws.key]?.isSkipped).toBe(true);
    }
  });

  it("wipes typed values when skipping", () => {
    let s = entryReducer(buildDay1State(), { type: "start" });
    s = entryReducer(s, { type: "setField", field: "weight", value: "100" });
    s = entryReducer(s, { type: "setField", field: "reps", value: "5" });
    s = entryReducer(s, { type: "skipExercise" });
    const set1 = s.plan!.workingSets[0];
    expect(s.values[set1.key]).toEqual({ weight: "", reps: "", isSkipped: true });
  });
});
