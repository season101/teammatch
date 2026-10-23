"use client";

import { useState, useSyncExternalStore } from "react";

// Settings → Keyboard shortcuts. A per-browser preference, on unless turned off.
const KEY = "teammatch:keyboard-shortcuts";

function read() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// The deck (F3-03) and review queue (F4-04) check this before handling a key.
export function useShortcutsEnabled() {
  return useSyncExternalStore(subscribe, read, () => true);
}

export function setShortcutsEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // shortcut: with storage blocked the choice can't be saved and stays on; move it to the profile API if that matters.
  }
  // "storage" only fires in other tabs, so tell this one too.
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

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
