"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFlowGuard } from "./FlowGuardContext";

export function TopNav() {
  const router = useRouter();
  const { attemptLeave } = useFlowGuard();

  return (
    <nav className="fixed top-0 inset-x-0 h-14 bg-(--color-bg-surface) border-b border-(--color-border) flex items-center px-4 z-30">
      <Link
        href="/workouts"
        onClick={(e) => {
          e.preventDefault();
          attemptLeave(() => router.push("/workouts"));
        }}
        className="text-xl font-semibold text-(--color-accent)"
        aria-label="LOG — home"
      >
        LOG
      </Link>
    </nav>
  );
}
