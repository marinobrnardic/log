"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function DiscardDialog({
  open,
  onConfirm,
  onCancel,
  title = "Discard this workout?",
  message = "Your progress will be lost.",
  confirmLabel = "Discard",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-(--color-bg-surface) rounded-lg p-6 w-full max-w-sm space-y-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-(--color-text-secondary)">{message}</p>
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
