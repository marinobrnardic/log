"use server";

import { revalidatePath } from "next/cache";
import { isWeightIncrement } from "@/lib/domain/progression";
import { upsertWeightIncrement } from "@/lib/db/queries";

/** Persist the user's preferred weight increment. Returns an error string on
 *  failure (validation or DB) so the client can surface it without throwing. */
export async function setWeightIncrementAction(
  value: number,
): Promise<{ error?: string }> {
  if (!isWeightIncrement(value)) {
    return { error: "Invalid increment" };
  }
  try {
    await upsertWeightIncrement(value);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save setting";
    return { error: message };
  }
  revalidatePath("/profile");
  return {};
}
