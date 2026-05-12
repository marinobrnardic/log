"use client";

import type { Ref } from "react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
  size?: "lg" | "md";
  inputRef?: Ref<HTMLInputElement>;
}

export function RepsInput({
  value,
  onChange,
  disabled,
  placeholder,
  invalid,
  ariaLabel,
  size = "lg",
  inputRef,
}: Props) {
  const sizeCls = size === "lg" ? "text-2xl min-h-[64px]" : "text-base min-h-[44px]";
  const borderCls = invalid
    ? "border-(--color-destructive)"
    : "border-(--color-border)";
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(sanitizeInt(e.target.value))}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel ?? "Reps"}
      aria-invalid={invalid || undefined}
      className={`w-full text-center rounded-lg bg-(--color-bg-surface) border focus:outline-none focus:ring-2 focus:ring-(--color-accent) tabular disabled:opacity-50 ${sizeCls} ${borderCls}`}
    />
  );
}

export function sanitizeInt(s: string): string {
  return s.replace(/[^0-9]/g, "");
}
