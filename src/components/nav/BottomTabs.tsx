"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Dumbbell, LineChart, User } from "lucide-react";
import { useFlowGuard } from "./FlowGuardContext";

const TABS = [
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/analytics", icon: LineChart, label: "Analytics" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const { attemptLeave } = useFlowGuard();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-(--color-bg-surface) border-t border-(--color-border) safe-bottom z-30"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-3 h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  attemptLeave(() => router.push(href));
                }}
                className={`h-full flex flex-col items-center justify-center gap-1 text-xs ${
                  active
                    ? "text-(--color-accent)"
                    : "text-(--color-text-muted) hover:text-(--color-text-secondary)"
                }`}
                aria-label={label}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
