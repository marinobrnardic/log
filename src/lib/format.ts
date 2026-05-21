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

/** YYYY-MM-DD in local time, suitable for `<input type="date" value=…>`. */
export function toLocalDateInputValue(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Replace the calendar day on `iso` with the day from `dateInput`
 *  (YYYY-MM-DD, local). Time-of-day on the original is preserved. */
export function replaceCalendarDate(iso: string, dateInput: string): string {
  const [y, m, d] = dateInput.split("-").map(Number);
  const next = new Date(iso);
  next.setFullYear(y, m - 1, d);
  return next.toISOString();
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
