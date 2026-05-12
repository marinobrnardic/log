"use client";

import { useId, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface Props {
  tabs: TabItem[];
  defaultTabId?: string;
}

export function Tabs({ tabs, defaultTabId }: Props) {
  const baseId = useId();
  const [activeId, setActiveId] = useState<string>(defaultTabId ?? tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="sticky top-14 z-20 -mx-4 px-4 bg-(--color-bg-base) border-b border-(--color-border) flex gap-1 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={`px-4 min-h-[44px] -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-(--color-accent) text-(--color-text-primary)"
                  : "border-transparent text-(--color-text-muted) hover:text-(--color-text-secondary)"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
      >
        {active.content}
      </div>
    </div>
  );
}
