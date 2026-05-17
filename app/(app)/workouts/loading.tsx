export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <h1 className="text-3xl font-semibold py-2">Workouts</h1>
      <ul className="space-y-3 pb-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="bg-(--color-bg-surface) rounded-lg p-4">
              <div className="h-7 w-40 rounded bg-(--color-bg-surface-2)" />
              <div className="mt-2 h-4 w-32 rounded bg-(--color-bg-surface-2)" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
