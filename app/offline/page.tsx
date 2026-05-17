import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — LOG",
};

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold mb-2">You&apos;re offline</h1>
        <p className="text-(--color-text-secondary)">
          Reconnect to see this page. Workouts you&apos;ve already opened may still
          load from cache.
        </p>
      </div>
    </main>
  );
}
