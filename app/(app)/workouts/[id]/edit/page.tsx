import { notFound } from "next/navigation";
import { WorkoutEditForm } from "@/components/workouts/WorkoutEditForm";
import { getWorkoutById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkoutById(id);
  if (!workout) notFound();
  return <WorkoutEditForm workout={workout} />;
}
