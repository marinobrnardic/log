import { WorkoutCalendar } from "@/components/workouts/WorkoutCalendar";
import { getWorkoutHistory } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const workouts = await getWorkoutHistory();

  return (
    <div>
      <h1 className="text-3xl font-semibold py-2 px-1">Workouts</h1>
      <WorkoutCalendar workouts={workouts} />
    </div>
  );
}
