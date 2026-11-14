"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";

const STAYS_FOR = 4000;

// "Passed on Backend developer" with Undo (toast.md): top centre on a phone, top right
// on desktop. It goes after 4 seconds, and waits while it's hovered or focused.
// The deck's own live region announces the pass, so this one stays quiet.
// onDone must keep its identity between renders, or the clock restarts.
export function PassToast({
  role,
  onUndo,
  onDone,
}: {
  role: string;
  onUndo: () => void;
  onDone: () => void;
}) {
  // Either one holds the clock: a pointer leaving doesn't release a focused Undo.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;
  useEffect(() => {
    if (held) return;
    const timer = setTimeout(onDone, STAYS_FOR);
    return () => clearTimeout(timer);
  }, [held, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] z-40 flex justify-center px-4 lg:justify-end lg:px-6">
      <div
        className="pointer-events-auto w-full max-w-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Toast
          title={`Passed on ${role}`}
          announce={false}
          action={{ label: "Undo", onClick: onUndo }}
          onDismiss={onDone}
        />
      </div>
    </div>
  );
}
