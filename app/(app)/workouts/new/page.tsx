import { GuidedFlow, type GuidedFlowDataset } from "@/components/entry/GuidedFlow";
import {
  getExercisesForDay,
  getFullWorkoutHistory,
  getWeightIncrement,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const [a, b, history, weightIncrement] = await Promise.all([
    getExercisesForDay(1),
    getExercisesForDay(2),
    getFullWorkoutHistory(),
    getWeightIncrement(),
  ]);

  const data: GuidedFlowDataset = {
    dayA: { exercises: a.exercises, templates: a.templates },
    dayB: { exercises: b.exercises, templates: b.templates },
    history,
    weightIncrement,
  };

  return <GuidedFlow data={data} />;
}
