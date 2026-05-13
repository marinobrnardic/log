import { DAY_LABEL } from "@/lib/domain/types";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const sameYearFmt = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const otherYearFmt = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const chartFmt = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Relative time for ≤7 days; weekday + abbreviated month otherwise. */
export function formatWorkoutDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) return rtf.format(-diffDays, "day");
  if (diffDays < 0 || date.getFullYear() !== now.getFullYear()) {
    return otherYearFmt.format(date);
  }
  return sameYearFmt.format(date);
}

/** Compact "May 4" for chart axes. */
export function formatChartDate(iso: string): string {
  return chartFmt.format(new Date(iso));
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
