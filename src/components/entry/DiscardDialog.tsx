"use client";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscardDialog({ open, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-(--color-bg-surface) rounded-lg p-6 w-full max-w-sm space-y-4">
        <h3 className="text-xl font-semibold">Discard this workout?</h3>
        <p className="text-sm text-(--color-text-secondary)">
          Your progress will be lost.
        </p>
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-lg border border-(--color-border)"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] px-4 rounded-lg text-(--color-destructive) border border-(--color-destructive)/40"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
