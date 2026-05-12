"use client";

import type { SetValue } from "@/lib/domain/types";
import { WeightInput } from "@/components/inputs/WeightInput";
import { RepsInput } from "@/components/inputs/RepsInput";

interface Props {
  value: SetValue;
  targetRepsMin: number;
  targetRepsMax: number;
  onChange: (field: "weight" | "reps", value: string) => void;
  onToggleSkip: () => void;
}

export function SetInputs({ value, targetRepsMin, targetRepsMax, onChange, onToggleSkip }: Props) {
  const repsHint =
    targetRepsMin === targetRepsMax ? `${targetRepsMin}` : `${targetRepsMin}-${targetRepsMax}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleSkip}
          aria-pressed={value.isSkipped}
          className={`min-h-[44px] px-3 rounded-lg text-sm border ${
            value.isSkipped
              ? "border-(--color-accent) text-(--color-accent)"
              : "border-(--color-border) text-(--color-text-secondary)"
          }`}
        >
          {value.isSkipped ? "Skipped" : "Skip"}
        </button>
      </div>

      {value.isSkipped ? (
        <div className="text-center text-(--color-text-muted) py-8 border border-(--color-border) rounded-lg">
          Skipped
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="block text-sm text-(--color-text-secondary)">Weight (kg)</span>
            <WeightInput
              value={value.weight}
              onChange={(v) => onChange("weight", v)}
              placeholder="0"
              ariaLabel="Weight in kilograms"
            />
          </label>
          <label className="space-y-1 block">
            <span className="block text-sm text-(--color-text-secondary)">Reps</span>
            <RepsInput
              value={value.reps}
              onChange={(v) => onChange("reps", v)}
              placeholder={repsHint}
              ariaLabel="Reps"
            />
          </label>
        </div>
      )}
    </div>
  );
}
