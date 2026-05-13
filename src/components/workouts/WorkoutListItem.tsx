import Link from "next/link";
import { dayLabel, formatWorkoutDate } from "@/lib/format";

interface Props {
  id: string;
  splitName: string;
  day: number;
  createdAt: string;
}

export function WorkoutListItem({ id, splitName, day, createdAt }: Props) {
  return (
    <Link
      href={`/workouts/${id}`}
      className="block bg-(--color-bg-surface) rounded-lg p-4 hover:bg-(--color-bg-surface-2)"
    >
      <div className="text-2xl font-semibold tabular">
        {formatWorkoutDate(createdAt)}
      </div>
      <div className="text-sm text-(--color-text-secondary) mt-1">
        {splitName} · Day {dayLabel(day)}
      </div>
    </Link>
  );
}
