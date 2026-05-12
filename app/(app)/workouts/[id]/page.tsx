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
    <div className="space-y-6 pb-6">
      <header>
        <h1 className="text-3xl font-semibold">
          {SPLIT_NAME} <span className="text-(--color-text-secondary)">·</span> Day{" "}
          {dayLabel(workout.day)}
        </h1>
        <p className="text-sm text-(--color-text-secondary) mt-1 tabular">
          {formatWorkoutDate(workout.createdAt)}
        </p>
      </header>

      <RecapView workout={workout} />

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 px-4 pt-3 pb-3 bg-(--color-bg-base) border-t border-(--color-border) flex gap-2">
        <DeleteWorkoutButton workoutId={workout.id} />
        <Link
          href={`/workouts/${workout.id}/edit`}
          className="flex-1 min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) flex items-center justify-center gap-2"
        >
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
          Edit
        </Link>
      </div>
    </div>
  );
}
