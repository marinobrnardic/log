"use client";

import { useActionState } from "react";
import { resetPasswordRequestAction } from "./actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordRequestAction, null);

  if (state?.sent) {
    return (
      <p className="text-sm text-(--color-text-primary)">
        Check your email for a reset link.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm text-(--color-text-secondary)">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full min-h-[44px] px-3 rounded-lg bg-(--color-bg-surface) border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        />
      </div>
      {state?.error && <p className="text-sm text-(--color-destructive)">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
