"use client";

interface Props {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
  size?: "lg" | "md";
}

export function WeightInput({
  value,
  onChange,
  disabled,
  placeholder = "0",
  invalid,
  ariaLabel,
  size = "lg",
}: Props) {
  const sizeCls = size === "lg" ? "text-2xl min-h-[64px]" : "text-base min-h-[44px]";
  const borderCls = invalid
    ? "border-(--color-destructive)"
    : "border-(--color-border)";
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel ?? "Weight in kg"}
      aria-invalid={invalid || undefined}
      className={`w-full text-center rounded-lg bg-(--color-bg-surface) border focus:outline-none focus:ring-2 focus:ring-(--color-accent) tabular disabled:opacity-50 ${sizeCls} ${borderCls}`}
    />
  );
}

export function sanitizeDecimal(s: string): string {
  const cleaned = s.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
