import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import { Tabs } from "@/components/ui/Tabs";
import { getFullWorkoutHistory } from "@/lib/db/queries";
import { build1RMSeries, buildTopSetSeries } from "@/lib/domain/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const workouts = await getFullWorkoutHistory();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold py-2">Analytics</h1>
      <Tabs
        tabs={[
          {
            id: "top-set",
            label: "Top Set",
            content: (
              <AnalyticsSection yUnit="kg" build={buildTopSetSeries} workouts={workouts} />
            ),
          },
          {
            id: "e1rm",
            label: "Estimated 1RM",
            content: (
              <AnalyticsSection yUnit="kg" build={build1RMSeries} workouts={workouts} />
            ),
          },
        ]}
      />
    </div>
  );
}
