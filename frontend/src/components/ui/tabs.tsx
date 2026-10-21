"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type Tab = { id: string; label: ReactNode; panel: ReactNode };

// Sidebar tabs (Applications | Teams): arrow keys, Home and End move between tabs.
export function Tabs({
  tabs,
  label,
  defaultTab = tabs[0]?.id,
}: {
  tabs: Tab[];
  label: string;
  defaultTab?: string;
}) {
  const [selected, setSelected] = useState(defaultTab);
  const base = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setSelected(tabs[next].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLElement>('[role="tab"]')
      [next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex border-b border-border">
        {tabs.map((tab, i) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, i)}
              className="relative min-h-11 flex-1 px-4 text-sm font-semibold text-muted transition-colors duration-fast ease-standard after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:scale-x-0 after:rounded-pill after:bg-primary hover:text-text aria-selected:text-text aria-selected:after:scale-x-100 motion-safe:after:transition-transform motion-safe:after:duration-base"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className="py-4"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
