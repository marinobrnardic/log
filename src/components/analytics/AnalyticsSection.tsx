import { LiftChart } from "./LiftChart";
import type { SavedWorkout } from "@/lib/domain/types";
import type { AnalyticsPoint } from "@/lib/domain/analytics";

const LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"] as const;

interface Props {
  yUnit?: string;
  build: (lift: string, workouts: SavedWorkout[]) => AnalyticsPoint[];
  workouts: SavedWorkout[];
}

export function AnalyticsSection({ yUnit, build, workouts }: Props) {
  return (
    <div className="space-y-3">
      {LIFTS.map((lift) => (
        <LiftChart key={lift} title={lift} points={build(lift, workouts)} yUnit={yUnit} />
      ))}
    </div>
  );
}
