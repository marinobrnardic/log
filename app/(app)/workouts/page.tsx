import Link from "next/link";
import { WorkoutListItem } from "@/components/workouts/WorkoutListItem";
import { getWorkoutHistory } from "@/lib/db/queries";

const SPLIT_NAME = "2-Day Split";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const workouts = await getWorkoutHistory();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold py-2">Workouts</h1>

      {workouts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3 pb-4">
          {workouts.map((w) => (
            <li key={w.id}>
              <WorkoutListItem
                id={w.id}
                splitName={SPLIT_NAME}
                day={w.day}
                createdAt={w.createdAt}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-16 safe-bottom px-4 z-20 pointer-events-none">
        <div className="max-w-[640px] mx-auto pb-3 pointer-events-auto">
          <Link
            href="/workouts/new"
            className="block w-full min-h-[44px] flex items-center justify-center rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover)"
          >
            New Workout
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-(--color-bg-surface) rounded-lg p-8 text-center space-y-4">
      <p className="text-(--color-text-secondary)">No workouts logged yet.</p>
      <Link
        href="/workouts/new"
        className="inline-block min-h-[44px] px-4 flex items-center justify-center rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover)"
      >
        Start Workout
      </Link>
    </div>
  );
}
