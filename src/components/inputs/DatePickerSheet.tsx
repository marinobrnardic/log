"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  /** YYYY-MM-DD, local. */
  value: string;
  onSelect: (next: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePickerSheet({ open, value, onSelect, onClose }: Props) {
  const selectedDate = useMemo(() => parseDateInput(value), [value]);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  // When (re)opening, jump the calendar to the selected month.
  useEffect(() => {
    if (open) {
      setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const today = new Date();
  const firstWeekday = viewMonth.getDay();
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const daysInPrevMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    0,
  ).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({
      date: new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() - 1,
        daysInPrevMonth - i,
      ),
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d),
      inMonth: true,
    });
  }
  let overflow = 1;
  while (cells.length < 42) {
    cells.push({
      date: new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, overflow++),
      inMonth: false,
    });
  }

  const goPrev = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNext = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pick a date"
      onClick={onClose}
    >
      <div
        className="bg-(--color-bg-surface) rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-(--color-bg-surface-2) text-(--color-text-primary)"
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <div
            className="text-base font-semibold tabular"
            aria-live="polite"
          >
            {MONTH_FMT.format(viewMonth)}
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-(--color-bg-surface-2) text-(--color-text-primary)"
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pb-1 text-center text-xs text-(--color-text-secondary)">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-2 pb-3">
          {cells.map(({ date, inMonth }, i) => {
            const isSelected = sameDay(date, selectedDate);
            const isToday = sameDay(date, today);
            const base = "h-11 rounded-lg text-base tabular";
            const tone = isSelected
              ? "bg-(--color-accent) text-(--color-accent-text) font-semibold"
              : inMonth
                ? "text-(--color-text-primary) hover:bg-(--color-bg-surface-2)"
                : "text-(--color-text-muted) hover:bg-(--color-bg-surface-2)";
            const ring =
              !isSelected && isToday ? "ring-1 ring-inset ring-(--color-accent)" : "";
            return (
              <button
                key={i}
                type="button"
                aria-label={date.toDateString()}
                aria-pressed={isSelected}
                onClick={() => onSelect(formatDateInput(date))}
                className={`${base} ${tone} ${ring}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-lg border border-(--color-border) text-(--color-text-primary)"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
