"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useFlowGuard } from "./FlowGuardContext";

export function TopNav() {
  const router = useRouter();
  const { attemptLeave } = useFlowGuard();

  return (
    <nav className="fixed top-0 inset-x-0 safe-top bg-(--color-bg-surface) border-b border-(--color-border) z-30">
      <div className="h-14 flex items-center px-4">
        <Link
          href="/workouts"
          onClick={(e) => {
            e.preventDefault();
            attemptLeave(() => router.push("/workouts"));
          }}
          className="flex items-center"
          aria-label="log — home"
        >
          <Logo size={28} />
        </Link>
      </div>
    </nav>
  );
}
