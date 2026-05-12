"use client";

import type { ExerciseRow } from "@/lib/domain/types";

interface Props {
  selectedDay: 1 | 2 | null;
  dayAExercises: ExerciseRow[];
  dayBExercises: ExerciseRow[];
  onSelect: (day: 1 | 2) => void;
  onStart: () => void;
}

export function DayPicker({
  selectedDay,
  dayAExercises,
  dayBExercises,
  onSelect,
  onStart,
}: Props) {
  const preview = selectedDay === 1 ? dayAExercises : selectedDay === 2 ? dayBExercises : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">New workout</h1>

      <div className="grid grid-cols-2 gap-3">
        {([1, 2] as const).map((d) => {
          const active = selectedDay === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={`min-h-[80px] rounded-lg text-2xl font-semibold border-2 ${
                active
                  ? "border-(--color-accent) text-(--color-accent) bg-(--color-bg-surface)"
                  : "border-(--color-border) text-(--color-text-primary) bg-(--color-bg-surface)"
              }`}
              aria-pressed={active}
            >
              Day {d === 1 ? "A" : "B"}
            </button>
          );
        })}
      </div>

      {preview && (
        <ul className="space-y-1 text-(--color-text-secondary)">
          {preview.map((ex) => (
            <li key={ex.id}>{ex.name}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!selectedDay}
        className="w-full min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
      >
        Start Workout
      </button>
    </div>
  );
}
