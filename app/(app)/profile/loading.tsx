export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <h1 className="text-3xl font-semibold py-2">Profile</h1>

      <div className="bg-(--color-bg-surface) rounded-lg p-4 space-y-2" aria-hidden="true">
        <div className="h-4 w-12 rounded bg-(--color-bg-surface-2)" />
        <div className="h-5 w-48 rounded bg-(--color-bg-surface-2)" />
      </div>

      <div className="bg-(--color-bg-surface) rounded-lg p-4" aria-hidden="true">
        <div className="h-5 w-32 rounded bg-(--color-bg-surface-2)" />
      </div>

      <div
        aria-hidden="true"
        className="w-full min-h-[44px] rounded-lg border border-(--color-border)"
      />
    </div>
  );
}
