interface Props {
  exerciseName: string;
  setLabel: string;
  current: number;
  total: number;
}

export function SetProgress({ exerciseName, setLabel, current, total }: Props) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold truncate">
          {exerciseName} <span className="text-(--color-text-secondary)">— {setLabel}</span>
        </h2>
        <span className="text-sm text-(--color-text-secondary) tabular shrink-0">
          Set {current} / {total}
        </span>
      </div>
      <div className="h-1 w-full bg-(--color-border) rounded">
        <div
          className="h-1 bg-(--color-accent) rounded transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
