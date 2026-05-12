"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWorkoutAction } from "@/actions/workouts";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteWorkoutAction(workoutId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.replace("/workouts");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 min-h-[44px] rounded-lg border border-(--color-destructive)/40 text-(--color-destructive) flex items-center justify-center gap-2"
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-(--color-bg-surface) rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold">Delete workout?</h3>
            <p className="text-sm text-(--color-text-secondary)">
              This will permanently remove the workout and all of its sets.
            </p>
            {error && <p className="text-sm text-(--color-destructive)">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="min-h-[44px] px-4 rounded-lg border border-(--color-border)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="min-h-[44px] px-4 rounded-lg text-(--color-destructive) border border-(--color-destructive)/40 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
