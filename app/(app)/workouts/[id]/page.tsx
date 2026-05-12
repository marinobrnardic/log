import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { RecapView } from "@/components/workouts/RecapView";
import { DeleteWorkoutButton } from "@/components/workouts/DeleteWorkoutButton";
import { getWorkoutById } from "@/lib/db/queries";
import { dayLabel, formatWorkoutDate } from "@/lib/format";

const SPLIT_NAME = "2-Day Split";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkoutById(id);
  if (!workout) notFound();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold">
            {SPLIT_NAME} <span className="text-(--color-text-secondary)">·</span> Day{" "}
            {dayLabel(workout.day)}
          </h1>
          <p className="text-sm text-(--color-text-secondary) mt-1 tabular">
            {formatWorkoutDate(workout.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/workouts/${workout.id}/edit`}
            className="p-2 -m-2 text-(--color-text-secondary) hover:text-(--color-text-primary)"
            aria-label="Edit workout"
          >
            <Pencil size={20} strokeWidth={1.75} />
          </Link>
          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </header>

      <RecapView workout={workout} />
    </div>
  );
}
