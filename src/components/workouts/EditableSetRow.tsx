"use client";

import { WeightInput } from "@/components/inputs/WeightInput";
import { RepsInput } from "@/components/inputs/RepsInput";
import type { SetValue } from "@/lib/domain/types";

interface Props {
  label: string;
  value: SetValue;
  invalid?: boolean;
  onChange: (field: "weight" | "reps", value: string) => void;
  onToggleSkip: () => void;
}

export function EditableSetRow({ label, value, invalid, onChange, onToggleSkip }: Props) {
  return (
    <div
      className={`flex items-center gap-2 py-2 ${value.isSkipped ? "opacity-50" : ""}`}
    >
      <div className="w-24 shrink-0 text-sm text-(--color-text-secondary)">{label}</div>
      {value.isSkipped ? (
        <div className="flex-1 text-center text-(--color-text-muted) text-sm py-2">
          Skipped
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1">
            <WeightInput
              value={value.weight}
              onChange={(v) => onChange("weight", v)}
              placeholder="kg"
              ariaLabel={`${label} weight in kilograms`}
              size="md"
              invalid={invalid && (value.weight === "" || Number(value.weight) <= 0)}
              disabled={value.isSkipped}
            />
          </div>
          <span className="text-(--color-text-muted) text-sm shrink-0">×</span>
          <div className="w-20 shrink-0">
            <RepsInput
              value={value.reps}
              onChange={(v) => onChange("reps", v)}
              placeholder="reps"
              ariaLabel={`${label} reps`}
              size="md"
              invalid={invalid && (value.reps === "" || Number(value.reps) < 1)}
              disabled={value.isSkipped}
            />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onToggleSkip}
        aria-pressed={value.isSkipped}
        className={`min-h-[44px] px-2 text-xs rounded-lg border shrink-0 ${
          value.isSkipped
            ? "border-(--color-accent) text-(--color-accent)"
            : "border-(--color-border) text-(--color-text-secondary)"
        }`}
      >
        {value.isSkipped ? "Skipped" : "Skip"}
      </button>
    </div>
  );
}
