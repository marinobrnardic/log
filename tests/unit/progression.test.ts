import { describe, expect, it } from "vitest";
import { getSuggestedWeight } from "@/lib/domain/progression";
import type { SavedWorkout, SetType } from "@/lib/domain/types";

interface SetSpec {
  type: SetType;
  weight: number | null;
  reps: number | null;
  skipped?: boolean;
}

const mkWorkout = (
  createdAt: string,
  exerciseName: string,
  sets: SetSpec[],
): SavedWorkout => ({
  id: createdAt,
  day: 1,
  splitId: "2day",
  createdAt,
  exercises: [
    {
      id: `we-${createdAt}`,
      exerciseId: `ex-${exerciseName}`,
      exerciseName,
      orderIndex: 1,
      sets: sets.map((s, i) => ({
        id: `s-${createdAt}-${i}`,
        setType: s.type,
        orderIndex: i,
        reps: s.reps,
        weight: s.weight,
        isSkipped: !!s.skipped,
      })),
    },
  ],
});

describe("getSuggestedWeight", () => {
  it("returns null when there is no history", () => {
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history: [],
        increment: 2.5,
      }),
    ).toBeNull();
  });

  it("returns null when no prior workout has this exercise", () => {
    const history = [
      mkWorkout("2025-03-01", "Bench Press", [
        { type: "top_set", weight: 100, reps: 5 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBeNull();
  });

  it("returns the matched weight when reps are below target_reps_max", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 100, reps: 5 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBe(100);
  });

  it("bumps by 2.5 kg when reps hit target_reps_max", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 100, reps: 6 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBe(102.5);
  });

  it("bumps by 5 kg when increment is 5", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 100, reps: 6 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 5,
      }),
    ).toBe(105);
  });

  it("bumps when reps exceed target_reps_max (rep PR)", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 100, reps: 8 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBe(102.5);
  });

  it("matches on setType — top_set in history isn't used for a backoff suggestion", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 120, reps: 5 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "backoff",
        indexInExercise: 1,
        targetRepsMax: 10,
        history,
        increment: 2.5,
      }),
    ).toBeNull();
  });

  it("matches by indexInExercise when multiple backoff sets exist", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 120, reps: 5 },
        { type: "backoff", weight: 100, reps: 8 },
        { type: "backoff", weight: 95, reps: 7 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "backoff",
        indexInExercise: 1,
        targetRepsMax: 10,
        history,
        increment: 2.5,
      }),
    ).toBe(100);
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "backoff",
        indexInExercise: 2,
        targetRepsMax: 10,
        history,
        increment: 2.5,
      }),
    ).toBe(95);
  });

  it("falls back to any same-setType non-skipped set when the exact index was skipped", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 120, reps: 5 },
        { type: "backoff", weight: 100, reps: 8 },
        { type: "backoff", weight: null, reps: null, skipped: true },
      ]),
    ];
    // Asking for the 2nd backoff (index 2) — exact match is skipped, fall
    // back to the other backoff (index 1).
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "backoff",
        indexInExercise: 2,
        targetRepsMax: 10,
        history,
        increment: 2.5,
      }),
    ).toBe(100);
  });

  it("ignores skipped sets at the exact index and falls back within the same workout", () => {
    const history = [
      mkWorkout("2025-03-01", "Bench Press", [
        { type: "top_set", weight: null, reps: null, skipped: true },
      ]),
      mkWorkout("2025-02-01", "Bench Press", [
        { type: "top_set", weight: 80, reps: 5 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Bench Press",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBe(80);
  });

  it("ignores sets with null or zero weight", () => {
    const history = [
      mkWorkout("2025-03-01", "Pull-ups", [
        { type: "normal", weight: 0, reps: 10 },
        { type: "normal", weight: null, reps: 10 },
      ]),
      mkWorkout("2025-02-01", "Pull-ups", [
        { type: "normal", weight: 5, reps: 10 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Pull-ups",
        setType: "normal",
        indexInExercise: 0,
        targetRepsMax: 10,
        history,
        increment: 2.5,
      }),
    ).toBe(7.5); // 5 + 2.5 (hit max reps)
  });

  it("uses the most recent (first in newest-first history) match", () => {
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 110, reps: 5 },
      ]),
      mkWorkout("2025-02-01", "Squat", [
        { type: "top_set", weight: 100, reps: 6 },
      ]),
    ];
    expect(
      getSuggestedWeight({
        exerciseName: "Squat",
        setType: "top_set",
        indexInExercise: 0,
        targetRepsMax: 6,
        history,
        increment: 2.5,
      }),
    ).toBe(110);
  });

  it("rounds float-arithmetic noise to 1 decimal", () => {
    // 102.49999999999999 would otherwise leak into the input.
    const history = [
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 99.9999999, reps: 6 },
      ]),
    ];
    const result = getSuggestedWeight({
      exerciseName: "Squat",
      setType: "top_set",
      indexInExercise: 0,
      targetRepsMax: 6,
      history,
      increment: 2.5,
    });
    expect(result).toBe(102.5);
  });
});
