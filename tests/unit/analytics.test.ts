import { describe, expect, it } from "vitest";
import {
  build1RMSeries,
  buildTopSetSeries,
  buildVolumeSeries,
  calculateVolume,
  estimate1RM,
  topSetForExercise,
} from "@/lib/domain/analytics";
import type { SavedSet, SavedWorkout } from "@/lib/domain/types";

const set = (s: Partial<SavedSet>): SavedSet => ({
  id: "1",
  setType: "normal",
  orderIndex: 0,
  reps: null,
  weight: null,
  isSkipped: false,
  ...s,
});

describe("estimate1RM", () => {
  it("applies Epley", () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(100 * (1 + 5 / 30));
    expect(estimate1RM(140, 1)).toBeCloseTo(140 * (1 + 1 / 30));
  });

  it("returns null for invalid inputs", () => {
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(-10, 5)).toBeNull();
    expect(estimate1RM(100, 0)).toBeNull();
    expect(estimate1RM(NaN, 5)).toBeNull();
  });
});

describe("calculateVolume", () => {
  it("sums weight * reps across non-skipped sets", () => {
    expect(
      calculateVolume([
        set({ weight: 100, reps: 5 }),
        set({ weight: 120, reps: 8 }),
      ]),
    ).toBe(100 * 5 + 120 * 8);
  });

  it("excludes skipped sets and sets missing data", () => {
    expect(
      calculateVolume([
        set({ weight: 100, reps: 5 }),
        set({ weight: 120, reps: 8, isSkipped: true }),
        set({ weight: null, reps: 5 }),
        set({ weight: 100, reps: null }),
      ]),
    ).toBe(100 * 5);
  });
});

describe("topSetForExercise", () => {
  it("picks the set with type top_set for non-deadlift", () => {
    const top = topSetForExercise("Squat", [
      set({ id: "a", setType: "backoff", weight: 100, reps: 8 }),
      set({ id: "b", setType: "top_set", weight: 130, reps: 4 }),
      set({ id: "c", setType: "backoff", weight: 110, reps: 8 }),
    ]);
    expect(top?.id).toBe("b");
  });

  it("ignores skipped sets", () => {
    const top = topSetForExercise("Bench Press", [
      set({ id: "a", setType: "top_set", weight: null, reps: null, isSkipped: true }),
      set({ id: "b", setType: "backoff", weight: 80, reps: 10 }),
    ]);
    // No non-skipped top_set → returns null.
    expect(top).toBeNull();
  });

  it("returns the heaviest non-skipped single for Deadlift", () => {
    const top = topSetForExercise("Deadlift", [
      set({ id: "a", setType: "normal", weight: 180, reps: 1 }),
      set({ id: "b", setType: "normal", weight: 200, reps: 1 }),
      set({ id: "c", setType: "normal", weight: 220, reps: 1, isSkipped: true }),
    ]);
    expect(top?.id).toBe("b");
  });
});

const mkSavedWorkout = (
  date: string,
  exerciseName: string,
  sets: SavedSet[],
): SavedWorkout => ({
  id: date,
  day: 1,
  splitId: "2day",
  createdAt: date,
  exercises: [
    {
      id: `we-${date}`,
      exerciseId: "ex",
      exerciseName,
      orderIndex: 1,
      sets,
    },
  ],
});

describe("series builders", () => {
  const workouts: SavedWorkout[] = [
    mkSavedWorkout("2025-02-01", "Squat", [
      set({ setType: "top_set", weight: 130, reps: 5 }),
      set({ setType: "backoff", weight: 110, reps: 8 }),
    ]),
    mkSavedWorkout("2025-01-01", "Squat", [
      set({ setType: "top_set", weight: 120, reps: 5 }),
      set({ setType: "backoff", weight: 100, reps: 8 }),
    ]),
  ];

  it("buildTopSetSeries returns top-set weights in ascending date order", () => {
    const points = buildTopSetSeries("Squat", workouts);
    expect(points.map((p) => p.value)).toEqual([120, 130]);
  });

  it("build1RMSeries applies Epley to the top set", () => {
    const points = build1RMSeries("Squat", workouts);
    expect(points[0].value).toBeCloseTo(120 * (1 + 5 / 30));
    expect(points[1].value).toBeCloseTo(130 * (1 + 5 / 30));
  });

  it("buildVolumeSeries sums non-skipped volume per workout", () => {
    const points = buildVolumeSeries("Squat", workouts);
    expect(points[0].value).toBe(120 * 5 + 100 * 8);
    expect(points[1].value).toBe(130 * 5 + 110 * 8);
  });

  it("skips workouts that don't include the lift", () => {
    expect(buildTopSetSeries("Bench Press", workouts)).toEqual([]);
  });
});
