"use client";

import { useState, useSyncExternalStore } from "react";

import { useShortcutsEnabled } from "./preferences";

export type LegendKey = [key: string, action: string];

// Only keys that work: feed.tsx and role-queue.tsx. ↓, Space and the profile keys come
// with the card pages and the Details panel, which aren't built yet.
export const DECK_KEYS: LegendKey[] = [
  ["←", "Pass"],
  ["→", "Apply"],
  ["↑ / Enter", "Details"],
  ["Z", "Undo pass"],
];

export const REVIEW_KEYS: LegendKey[] = [
  ["←", "Pass"],
  ["→", "Like"],
];

// True while something on screen takes the keys: the deck with a card on top, or a review
// queue with someone waiting. Both mark themselves with aria-keyshortcuts.
function watchKeys(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-keyshortcuts", "hidden"],
  });
  return () => observer.disconnect();
}
const keysWork = () =>
  [...document.querySelectorAll("[aria-keyshortcuts]")].some((el) => !el.closest("[hidden]"));

// Pinned to the bottom of the stage on desktop. Hide lasts until the next visit to the screen.
export function KeyboardLegend({ keys }: { keys: LegendKey[] }) {
  const enabled = useShortcutsEnabled();
  const [hidden, setHidden] = useState(false);
  const active = useSyncExternalStore(watchKeys, keysWork, () => false);
  if (!enabled || hidden || !active) return null;

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
