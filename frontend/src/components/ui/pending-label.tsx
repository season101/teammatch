"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const SHOW_AFTER = 300;
const HOLD_FOR = 500;

// The label of a button that waits on the server. The button itself disables on
// the press. The spinner only shows once the wait passes 300ms, and then stays at
// least 500ms, so a quick reply never flashes it. Label and spinner share one grid
// cell, so the button keeps its width.
export function PendingLabel({
  pending,
  label,
  children,
}: {
  pending: boolean;
  // What a screen reader hears while the spinner shows, e.g. "Saving".
  label: string;
  children: ReactNode;
}) {
  const [spinning, setSpinning] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    const timer = pending
      ? setTimeout(() => {
          shownAt.current = Date.now();
          setSpinning(true);
        }, SHOW_AFTER)
      : setTimeout(
          () => setSpinning(false),
          Math.max(0, HOLD_FOR - (Date.now() - shownAt.current)),
        );
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <span className="grid place-items-center">
      <span className={`col-start-1 row-start-1 ${spinning ? "invisible" : ""}`}>{children}</span>
      {spinning && (
        <span
          role="status"
          aria-label={label}
          // Keeps turning with reduced motion: a still spinner looks like a hang.
          className="col-start-1 row-start-1 size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
    </span>
  );
}
