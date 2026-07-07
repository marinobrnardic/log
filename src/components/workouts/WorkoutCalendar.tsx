"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { dayLabel } from "@/lib/format";
import { DeleteWorkoutButton } from "@/components/workouts/DeleteWorkoutButton";

interface Workout {
  id: string;
  day: 1 | 2;
  splitId: string;
  createdAt: string;
}

interface Props {
  workouts: Workout[];
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function WorkoutCalendar({ workouts }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Build date → workout lookup; array is newest-first so first match = most recent
  const workoutMap = useMemo(() => {
    const map = new Map<string, Workout>();
    for (const w of workouts) {
      const d = new Date(w.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, w);
    }
    return map;
  }, [workouts]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const selWorkout = selectedDay != null
    ? workoutMap.get(`${year}-${month}-${selectedDay}`)
    : undefined;
  const selDateStr = selectedDay != null
    ? `${MONTH_NAMES[month].slice(0, 3)} ${String(selectedDay).padStart(2, "0")}, ${year}`
    : "";

  return (
    <div>
      {/* Header */}
      <div className="pt-[22px] pb-[18px] border-b border-(--color-border)">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-[10px]">
            <h2 className="m-0 font-extrabold text-[28px] tracking-[-0.025em] leading-none">
              {MONTH_NAMES[month]}
            </h2>
            <span className="font-semibold text-[26px] tracking-[-0.03em] text-(--color-text-muted) leading-none">
              {year}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="w-[46px] h-[46px] bg-(--color-bg-surface) text-(--color-text-secondary) border border-(--color-border) rounded-[13px] text-xl flex items-center justify-center hover:bg-(--color-bg-surface-2) hover:text-(--color-text-primary) cursor-pointer"
            >
              ‹
            </button>
            <button
              onClick={nextMonth}
              className="w-[46px] h-[46px] bg-(--color-bg-surface) text-(--color-text-secondary) border border-(--color-border) rounded-[13px] text-xl flex items-center justify-center hover:bg-(--color-bg-surface-2) hover:text-(--color-text-primary) cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-[7px] pt-[18px] text-[11px] tracking-[.08em] uppercase text-(--color-text-muted) text-center">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-[7px] pt-3 pb-6">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} className="aspect-square rounded-xl" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const hasWorkout = workoutMap.has(`${year}-${month}-${d}`);
          const isToday = year === todayY && month === todayM && d === todayD;
          const isSel = d === selectedDay;

          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d === selectedDay ? null : d)}
              className={[
                "relative aspect-square flex items-center justify-center rounded-xl cursor-pointer overflow-hidden p-0",
                hasWorkout ? "bg-(--color-accent)/6" : "bg-(--color-bg-base)",
                isSel
                  ? "border-[1.5px] border-(--color-accent)"
                  : hasWorkout
                  ? "border border-(--color-accent)/30"
                  : "border border-(--color-border)",
                isToday ? "shadow-[inset_0_0_0_1px_var(--color-accent)]" : "",
              ].join(" ")}
            >
              <span className={[
                "text-sm tabular leading-none",
                hasWorkout || isSel ? "font-medium text-(--color-text-primary)" : "text-(--color-text-secondary)",
              ].join(" ")}>
                {String(d).padStart(2, "0")}
              </span>
              {hasWorkout && (
                <span className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-(--color-accent)" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="border-t border-(--color-border) py-[22px]">
        {selectedDay == null ? (
          <p className="text-xs tracking-[.1em] uppercase text-(--color-text-muted)">
            Tap a day to see details
          </p>
        ) : selWorkout ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex w-[34px] h-[34px] shrink-0">
              <svg width="100%" height="100%" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="23" fill="none" stroke="var(--color-accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray="116 145" transform="rotate(-128 32 32)" />
              </svg>
            </span>
            <Link href={`/workouts/${selWorkout.id}`} className="no-underline min-w-0">
              <div className="font-extrabold text-[19px] tracking-[-0.02em] leading-[1.1]">
                Day {dayLabel(selWorkout.day)} — 2-Day Split
              </div>
              <div className="text-[11px] tracking-[.1em] uppercase text-(--color-text-muted) mt-1">
                {selDateStr}
              </div>
            </Link>
            <div className="flex gap-3 ml-auto shrink-0">
              <Link
                href={`/workouts/${selWorkout.id}/edit`}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-lg border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) no-underline"
              >
                <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <DeleteWorkoutButton workoutId={selWorkout.id} iconOnly />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-[34px] h-[34px] shrink-0 rounded-full border border-dashed border-(--color-border) flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-(--color-bg-surface-2)" />
              </span>
              <div>
                <div className="font-extrabold text-[19px] tracking-[-0.02em] text-(--color-text-secondary) leading-[1.1]">
                  Rest day
                </div>
                <div className="text-[11px] tracking-[.1em] uppercase text-(--color-text-muted) mt-1">
                  {selDateStr}
                </div>
              </div>
            </div>
            <Link
              href="/workouts/new"
              className="h-[42px] px-5 bg-(--color-accent) text-(--color-accent-text) rounded-[11px] font-extrabold text-sm flex items-center no-underline hover:bg-(--color-accent-hover)"
            >
              Log a Workout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
