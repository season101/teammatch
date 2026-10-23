"use client";

import { useState } from "react";

import { useShortcutsEnabled } from "./preferences";

export type LegendKey = [key: string, action: string];

export const DECK_KEYS: LegendKey[] = [
  ["←", "Pass"],
  ["→", "Apply"],
  ["↑", "Details"],
  ["↓", "Close"],
  ["Z", "Undo pass"],
  ["Space", "Next page"],
  ["⇧→", "Apply with note"],
];

export const REVIEW_KEYS: LegendKey[] = [
  ["←", "Pass"],
  ["→", "Like"],
  ["↑", "Profile"],
  ["↓", "Close"],
  ["Space", "Next section"],
];

// Pinned to the bottom of the stage on desktop. Hide lasts until the next visit to the screen.
export function KeyboardLegend({ keys }: { keys: LegendKey[] }) {
  const enabled = useShortcutsEnabled();
  const [hidden, setHidden] = useState(false);
  if (!enabled || hidden) return null;

  return (
    <aside
      aria-label="Keyboard shortcuts"
      className="sticky bottom-0 mt-auto hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border bg-bg px-6 py-3 text-sm text-muted lg:flex"
    >
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="rounded-pill border border-border px-3 py-1 text-xs font-semibold text-text hover:bg-surface-2"
      >
        Hide
      </button>
      <ul className="contents">
        {keys.map(([key, action]) => (
          <li key={action} className="flex items-center gap-1.5">
            <kbd className="grid h-6 min-w-6 place-items-center rounded-chip bg-surface-2 px-1.5 text-xs font-semibold text-text">
              {key}
            </kbd>
            {action}
          </li>
        ))}
      </ul>
    </aside>
  );
}
