"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { AuthFormFields } from "../AuthFormFields";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <AuthFormFields error={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
