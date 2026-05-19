"use client";

import { useState, useTransition } from "react";
import { setWeightIncrementAction } from "@/actions/settings";
import { ALLOWED_WEIGHT_INCREMENTS } from "@/lib/domain/progression";

interface Props {
  current: number;
}

export function WeightIncrementSetting({ current }: Props) {
  // Optimistic local state so the active pill updates instantly.
  const [value, setValue] = useState(current);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSelect = (next: number) => {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await setWeightIncrementAction(next);
      if (res?.error) {
        setValue(previous); // revert on failure
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <div className="bg-(--color-bg-surface) rounded-lg p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-sm text-(--color-text-secondary)">Weight increment</div>
        <p className="text-sm text-(--color-text-muted)">
          How much to bump pre-filled weights when you hit the top of a rep range.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Weight increment"
        className="grid grid-cols-2 gap-2"
      >
        {ALLOWED_WEIGHT_INCREMENTS.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => onSelect(opt)}
              className={`min-h-[44px] rounded-lg border text-base tabular ${
                active
                  ? "border-(--color-accent) text-(--color-accent)"
                  : "border-(--color-border) text-(--color-text-primary) hover:bg-(--color-bg-surface-2)"
              } disabled:opacity-50`}
            >
              {opt} kg
            </button>
          );
        })}
      </div>
      {errorMsg && (
        <p className="text-sm text-(--color-destructive)" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
