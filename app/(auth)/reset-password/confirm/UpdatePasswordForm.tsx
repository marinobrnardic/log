"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updatePasswordAction } from "../actions";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.done) {
      const timeout = setTimeout(() => router.replace("/workouts"), 800);
      return () => clearTimeout(timeout);
    }
  }, [state?.done, router]);

  if (state?.done) {
    return <p className="text-sm text-(--color-text-primary)">Password updated. Redirecting…</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-(--color-text-secondary)">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
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
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
