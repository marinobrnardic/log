import { GuidedFlow, type GuidedFlowDataset } from "@/components/entry/GuidedFlow";
import {
  getExercisesForDay,
  getFullWorkoutHistory,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const [a, b, history] = await Promise.all([
    getExercisesForDay(1),
    getExercisesForDay(2),
    getFullWorkoutHistory(),
  ]);

  const data: GuidedFlowDataset = {
    dayA: { exercises: a.exercises, templates: a.templates },
    dayB: { exercises: b.exercises, templates: b.templates },
    history,
  };

  return <GuidedFlow data={data} />;
}
