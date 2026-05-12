"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";
import { AuthFormFields } from "../AuthFormFields";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <AuthFormFields error={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
