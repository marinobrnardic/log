import type { SavedWorkout } from "@/lib/domain/types";
import { formatWeight } from "@/lib/format";
import { setLabel } from "@/lib/domain/sets";

interface Props {
  workout: SavedWorkout;
  /** When provided, each set row is tappable and calls onJumpToSet(planIndex). */
  onJumpToSet?: (planIndex: number) => void;
}

export function RecapView({ workout, onJumpToSet }: Props) {
  let planIndex = 0;

  return (
    <div className="space-y-6">
      {workout.exercises.map((ex) => {
        // Group sets by type for proper "Back-off 1/2", "Set 1/2/3" labels.
        const typeCounts = new Map<string, number>();
        for (const s of ex.sets) typeCounts.set(s.setType, (typeCounts.get(s.setType) ?? 0) + 1);
        const typeIndex = new Map<string, number>();

        return (
          <section key={ex.id} className="space-y-2">
            <h3 className="text-2xl font-semibold">{ex.exerciseName}</h3>
            <ul className="space-y-1">
              {ex.sets.map((s) => {
                const idx = typeIndex.get(s.setType) ?? 0;
                typeIndex.set(s.setType, idx + 1);
                const label = setLabel(s.setType, idx, typeCounts.get(s.setType) ?? 1);
                const myIndex = planIndex++;
                const value = s.isSkipped
                  ? "Skipped"
                  : s.weight != null && s.reps != null
                    ? `${formatWeight(s.weight)} kg × ${s.reps}`
                    : "—";

                const inner = (
                  <div
                    className={`flex items-baseline justify-between py-2 border-b border-(--color-border) last:border-0 ${
                      s.isSkipped ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-(--color-text-secondary)">{label}</span>
                    <span className="tabular">{value}</span>
                  </div>
                );

                return (
                  <li key={s.id}>
                    {onJumpToSet ? (
                      <button
                        type="button"
                        onClick={() => onJumpToSet(myIndex)}
                        className="w-full text-left hover:bg-(--color-bg-surface-2) rounded px-2 -mx-2"
                      >
                        {inner}
                      </button>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
