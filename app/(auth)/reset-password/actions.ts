"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function resetPasswordRequestAction(
  _prev: { error?: string; sent?: boolean } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/confirm`,
  });
  if (error) return { error: error.message };

  return { sent: true };
}

export async function updatePasswordAction(
  _prev: { error?: string; done?: boolean } | null,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Password is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { done: true };
}
