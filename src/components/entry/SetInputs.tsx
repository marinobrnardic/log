"use client";

import type { Ref } from "react";
import { RotateCcw } from "lucide-react";
import type { SetValue } from "@/lib/domain/types";
import { WeightInput } from "@/components/inputs/WeightInput";
import { RepsInput } from "@/components/inputs/RepsInput";

interface Props {
  value: SetValue;
  targetRepsMin: number;
  targetRepsMax: number;
  onChange: (field: "weight" | "reps", value: string) => void;
  onToggleSkip: () => void;
  showHelper?: boolean;
  weightRef?: Ref<HTMLInputElement>;
  repsRef?: Ref<HTMLInputElement>;
}

export function SetInputs({
  value,
  targetRepsMin,
  targetRepsMax,
  onChange,
  onToggleSkip,
  showHelper,
  weightRef,
  repsRef,
}: Props) {
  const repsHint =
    targetRepsMin === targetRepsMax ? `${targetRepsMin}` : `${targetRepsMin}-${targetRepsMax}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleSkip}
          aria-pressed={value.isSkipped}
          className={`min-h-[44px] px-3 rounded-lg text-sm border inline-flex items-center gap-1.5 ${
            value.isSkipped
              ? "border-(--color-accent) text-(--color-accent)"
              : "border-(--color-border) text-(--color-text-secondary)"
          }`}
        >
          {value.isSkipped && <RotateCcw size={14} strokeWidth={1.75} />}
          {value.isSkipped ? "Undo skip" : "Skip"}
        </button>
      </div>

      {value.isSkipped ? (
        <div className="text-center py-8 border border-(--color-border) rounded-lg space-y-1">
          <p className="text-(--color-text-muted)">Skipped</p>
          <p className="text-sm text-(--color-text-muted)">
            Tap &ldquo;Undo skip&rdquo; above to enter values.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="block text-sm text-(--color-text-secondary)">Weight (kg)</span>
              <WeightInput
                value={value.weight}
                onChange={(v) => onChange("weight", v)}
                placeholder="0"
                ariaLabel="Weight in kilograms"
                inputRef={weightRef}
              />
            </label>
            <label className="space-y-1 block">
              <span className="block text-sm text-(--color-text-secondary)">Reps</span>
              <RepsInput
                value={value.reps}
                onChange={(v) => onChange("reps", v)}
                placeholder={repsHint}
                ariaLabel="Reps"
                inputRef={repsRef}
              />
            </label>
          </div>
          {showHelper && (
            <p className="text-sm text-(--color-text-muted) text-center">
              Enter weight and reps, or tap Skip.
            </p>
          )}
        </>
      )}
    </div>
  );
}
