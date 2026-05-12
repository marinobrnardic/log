import { DAY_LABEL } from "@/lib/domain/types";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Relative time for ≤7 days; absolute date otherwise. */
export function formatWorkoutDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays < 0) return date.toLocaleDateString();
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return rtf.format(-diffDays, "day");
  return date.toLocaleDateString();
}

export function dayLabel(day: number): string {
  if (day === 1 || day === 2) return DAY_LABEL[day];
  return String(day);
}

/** Strip trailing zeroes — "100" not "100.0", "82.5" not "82.50". */
export function formatWeight(w: number | null | undefined): string {
  if (w == null) return "";
  return w
    .toFixed(2)
    .replace(/\.?0+$/, "");
}
