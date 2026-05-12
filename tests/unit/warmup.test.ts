import { describe, expect, it } from "vitest";
import {
  getAnchorWeight,
  getWarmupSets,
  qualifiesForWarmup,
  roundTo5,
} from "@/lib/domain/warmup";
import type { SavedWorkout } from "@/lib/domain/types";

const mkWorkout = (
  createdAt: string,
  exerciseName: string,
  sets: { type: "top_set" | "backoff" | "normal"; weight: number | null; reps: number | null; skipped?: boolean }[],
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
        id: `s-${i}`,
        setType: s.type,
        orderIndex: i,
        reps: s.reps,
        weight: s.weight,
        isSkipped: !!s.skipped,
      })),
    },
  ],
});

describe("roundTo5", () => {
  it("rounds to the nearest 5", () => {
    expect(roundTo5(57)).toBe(55);
    expect(roundTo5(58)).toBe(60);
    expect(roundTo5(60)).toBe(60);
    expect(roundTo5(82.5)).toBe(85); // .5 → up
  });

  it("clamps to 20", () => {
    expect(roundTo5(0)).toBe(20);
    expect(roundTo5(15)).toBe(20);
    expect(roundTo5(19)).toBe(20);
    expect(roundTo5(-50)).toBe(20);
  });
});

describe("qualifiesForWarmup", () => {
  it("returns true only for the big four", () => {
    expect(qualifiesForWarmup("Squat")).toBe(true);
    expect(qualifiesForWarmup("Bench Press")).toBe(true);
    expect(qualifiesForWarmup("Overhead Press")).toBe(true);
    expect(qualifiesForWarmup("Deadlift")).toBe(true);
    expect(qualifiesForWarmup("Pull-ups")).toBe(false);
    expect(qualifiesForWarmup("RDL")).toBe(false);
  });
});

describe("getWarmupSets", () => {
  it("returns null with no anchor", () => {
    expect(getWarmupSets(null)).toBeNull();
  });

  it("computes 50/70/90% rounded to 5, with empty bar first", () => {
    const sets = getWarmupSets(100);
    expect(sets).not.toBeNull();
    expect(sets!).toHaveLength(4);
    expect(sets![0]).toMatchObject({ weight: 20, reps: "10-15" });
    expect(sets![1].weight).toBe(50);
    expect(sets![2].weight).toBe(70);
    expect(sets![3].weight).toBe(90);
  });

  it("clamps low anchors so warmups never go below the empty bar", () => {
    const sets = getWarmupSets(30)!;
    // 30 * 0.5 = 15 → clamps to 20.
    expect(sets[1].weight).toBe(20);
  });
});

describe("getAnchorWeight", () => {
  it("returns null when the exercise isn't in the big four", () => {
    const history = [mkWorkout("2025-01-01", "RDL", [{ type: "normal", weight: 100, reps: 8 }])];
    expect(getAnchorWeight("RDL", history)).toBeNull();
  });

  it("returns null when there is no prior data", () => {
    expect(getAnchorWeight("Squat", [])).toBeNull();
  });

  it("uses the latest top_set weight for Squat / Bench / OHP", () => {
    const history: SavedWorkout[] = [
      // Newest first.
      mkWorkout("2025-03-01", "Squat", [
        { type: "top_set", weight: 140, reps: 4 },
        { type: "backoff", weight: 120, reps: 8 },
      ]),
      mkWorkout("2025-02-01", "Squat", [
        { type: "top_set", weight: 130, reps: 5 },
      ]),
    ];
    expect(getAnchorWeight("Squat", history)).toBe(140);
  });

  it("ignores skipped top sets and falls back to the next workout", () => {
    const history: SavedWorkout[] = [
      mkWorkout("2025-03-01", "Bench Press", [
        { type: "top_set", weight: null, reps: null, skipped: true },
      ]),
      mkWorkout("2025-02-01", "Bench Press", [
        { type: "top_set", weight: 100, reps: 5 },
      ]),
    ];
    expect(getAnchorWeight("Bench Press", history)).toBe(100);
  });

  it("derives Deadlift anchor as max non-skipped single / 0.9", () => {
    const history: SavedWorkout[] = [
      mkWorkout("2025-03-01", "Deadlift", [
        { type: "normal", weight: 180, reps: 1 },
        { type: "normal", weight: 200, reps: 1 },
        { type: "normal", weight: null, reps: null, skipped: true },
      ]),
    ];
    expect(getAnchorWeight("Deadlift", history)).toBeCloseTo(200 / 0.9, 5);
  });
});
