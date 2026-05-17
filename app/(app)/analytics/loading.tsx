export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <h1 className="text-3xl font-semibold py-2">Analytics</h1>
      <div className="space-y-4">
        <div
          aria-hidden="true"
          className="sticky top-14 z-20 -mx-4 px-4 bg-(--color-bg-base) border-b border-(--color-border) flex gap-1"
        >
          <div className="px-4 min-h-[44px] -mb-px border-b-2 border-(--color-accent) flex items-center">
            <div className="h-4 w-16 rounded bg-(--color-bg-surface-2)" />
          </div>
          <div className="px-4 min-h-[44px] -mb-px border-b-2 border-transparent flex items-center">
            <div className="h-4 w-24 rounded bg-(--color-bg-surface-2)" />
          </div>
        </div>
        <div aria-hidden="true" className="space-y-4">
          <div className="h-6 w-32 rounded bg-(--color-bg-surface-2)" />
          <div className="h-64 rounded-lg bg-(--color-bg-surface)" />
          <div className="h-6 w-32 rounded bg-(--color-bg-surface-2)" />
          <div className="h-64 rounded-lg bg-(--color-bg-surface)" />
        </div>
      </div>
    </div>
  );
}
