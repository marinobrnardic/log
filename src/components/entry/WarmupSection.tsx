import type { WarmupSet } from "@/lib/domain/types";

export function WarmupSection({ warmups }: { warmups: WarmupSet[] }) {
  return (
    <section
      aria-label="Warmups (suggested)"
      className="bg-(--color-bg-surface) rounded-lg p-4 space-y-2"
    >
      <h3 className="text-sm font-medium text-(--color-text-secondary)">
        Warmups (suggested)
      </h3>
      <ul className="text-sm space-y-1 tabular">
        {warmups.map((w) => (
          <li key={w.order} className="flex items-baseline justify-between gap-2">
            <span>
              {w.order}. {w.weight} kg × {w.reps}
            </span>
            <span className="text-(--color-text-muted)">{w.rest}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
