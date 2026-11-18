"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type Tab = { id: string; label: ReactNode; panel: ReactNode };

// Sidebar tabs (Applications | Teams): arrow keys, Home and End move between tabs.
export function Tabs({
  tabs,
  label,
  defaultTab = tabs[0]?.id,
  remember,
  selected: controlled,
  onSelect,
  listClassName = "",
}: {
  tabs: Tab[];
  label: string;
  defaultTab?: string;
  // Set both when something outside owns the choice (the profile's tabs on desktop sit
  // in the side pane, its panels in the page).
  selected?: string;
  onSelect?: (id: string) => void;
  // Extra classes for the tab row, e.g. to hide it where another row drives the panels.
  listClassName?: string;
  // A key to reopen the last chosen tab for the rest of the browser tab's session, e.g.
  // on Back from the resume viewer (F1-17). Read on mount, so not for server-rendered tabs.
  remember?: string;
}) {
  const key = `tm-tab:${remember}`;
  const [own, setSelectedState] = useState(() => {
    const last = remember && storage(() => sessionStorage.getItem(key));
    return tabs.find((tab) => tab.id === last)?.id ?? defaultTab;
  });
  const selected = controlled ?? own;
  function setSelected(id: string) {
    setSelectedState(id);
    onSelect?.(id);
    if (remember) storage(() => sessionStorage.setItem(key, id));
  }
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
      {/* Tabs that don't fit (many roles on a phone) scroll inside the row, not the page.
          The hairline is an inset shadow so the active underline covers it without
          poking out of the scroll box, and the focus ring sits inside each tab. */}
      <div
        role="tablist"
        aria-label={label}
        className={`flex overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)] ${listClassName}`}
      >
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
              className="relative min-h-11 flex-1 px-4 text-sm font-semibold whitespace-nowrap text-muted -outline-offset-2 transition-colors duration-fast ease-standard after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-pill after:bg-primary hover:text-text aria-selected:text-text aria-selected:after:scale-x-100 motion-safe:after:transition-transform motion-safe:after:duration-base"
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

// Storage can be blocked (private modes, site settings); then tabs just don't remember.
function storage<T>(access: () => T) {
  try {
    return access();
  } catch {
    return undefined;
  }
}
