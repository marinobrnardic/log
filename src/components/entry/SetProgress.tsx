interface Props {
  exerciseName: string;
  setLabel: string;
  /** 1-based set position for the header "Set X / Y". */
  position: number;
  /** 0-based count of sets passed in this exercise, for the bar fill.
   *  Decoupled from `position` so the bar reads "sets completed" while
   *  the header reads "set you're on". */
  completed: number;
  total: number;
  /** Changing this remounts the bar wrapper so the fill snaps to its new
   *  width instead of tweening backwards across an exercise boundary. */
  exerciseKey?: string;
}

export function SetProgress({
  exerciseName,
  setLabel,
  position,
  completed,
  total,
  exerciseKey,
}: Props) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold truncate">
          {exerciseName} <span className="text-(--color-text-secondary)">— {setLabel}</span>
        </h2>
        <span className="text-sm text-(--color-text-secondary) tabular shrink-0">
          Set {position} / {total}
        </span>
      </div>
      <div key={exerciseKey} className="h-1 w-full bg-(--color-border) rounded">
        <div
          className="h-1 bg-(--color-accent) rounded transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
