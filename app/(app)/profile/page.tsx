import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/actions/auth";
import { getWeightIncrement } from "@/lib/db/queries";
import { WeightIncrementSetting } from "@/components/profile/WeightIncrementSetting";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data: userData }, weightIncrement] = await Promise.all([
    supabase.auth.getUser(),
    getWeightIncrement(),
  ]);
  const user = userData.user;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold py-2">Profile</h1>

      <div className="bg-(--color-bg-surface) rounded-lg p-4 space-y-2">
        <div className="text-sm text-(--color-text-secondary)">Email</div>
        <div className="tabular">{user?.email ?? "—"}</div>
      </div>

      <WeightIncrementSetting current={weightIncrement} />

      <Link
        href="/reset-password"
        className="block bg-(--color-bg-surface) rounded-lg p-4 hover:bg-(--color-bg-surface-2)"
      >
        Reset password
      </Link>

      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full min-h-[44px] rounded-lg border border-(--color-border) text-(--color-text-primary) hover:bg-(--color-bg-surface)"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
