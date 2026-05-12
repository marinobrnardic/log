import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import { getFullWorkoutHistory } from "@/lib/db/queries";
import {
  build1RMSeries,
  buildTopSetSeries,
  buildVolumeSeries,
} from "@/lib/domain/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workouts = await getFullWorkoutHistory();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold py-2">Analytics</h1>
      <AnalyticsSection
        title="Top Set Weight"
        yUnit="kg"
        build={buildTopSetSeries}
        workouts={workouts}
      />
      <AnalyticsSection
        title="Estimated 1RM"
        yUnit="kg"
        build={build1RMSeries}
        workouts={workouts}
      />
      <AnalyticsSection
        title="Total Volume"
        yUnit="kg·reps"
        build={buildVolumeSeries}
        workouts={workouts}
      />
    </div>
  );
}
