"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { setCoachSeen, useCoachSeen } from "@/features/shell/preferences";
import { StepProgress } from "./step-progress";

const MARKS = [
  ["→", "Swipe right to apply"],
  ["←", "Swipe left to pass"],
  ["+", "Tap the card for details"],
];

// Step 4 of onboarding: a bottom sheet over the deck, shown once per browser.
// Not the Modal component: that one is a gate with two choices. Same native
// <dialog>, so the page behind is inert and Esc closes it.
export function CoachMarks() {
  const seen = useCoachSeen();
  // Closes the sheet even when storage is blocked and "seen" can't be saved.
  const [closed, setClosed] = useState(false);
  // The swipe hint stops the moment it's touched.
  const [touched, setTouched] = useState(false);
  const open = !seen && !closed;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      ctaRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function close() {
    setClosed(true);
    setCoachSeen();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={close}
      className="sheet mx-auto mt-auto w-full max-w-md rounded-t-sheet border border-border bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-text shadow-modal backdrop:bg-scrim open:flex open:flex-col open:gap-4"
    >
      <StepProgress step={4} />
      <h2 id={titleId} className="font-display text-2xl font-extrabold">
        One role at a time
      </h2>
      {/* Shows the gesture instead of only describing it. Hidden with reduced motion; the rows below say the same. */}
      <div
        aria-hidden="true"
        onPointerDown={() => setTouched(true)}
        className={`grid place-items-center py-1 motion-reduce:hidden ${touched ? "[&_*]:[animation-play-state:paused]" : ""}`}
      >
        <div className="relative h-20 w-28 rounded-row border border-border bg-surface-2 animate-coach-swipe">
          <span className="absolute top-2 left-2 -rotate-12 rounded-chip border-2 border-current px-1 text-[10px] font-extrabold tracking-wider text-apply-text opacity-0 animate-coach-apply">
            APPLY
          </span>
          <span className="absolute top-2 right-2 rotate-12 rounded-chip border-2 border-current px-1 text-[10px] font-extrabold tracking-wider text-pass opacity-0 animate-coach-pass">
            PASS
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {MARKS.map(([icon, label]) => (
          <li
            key={label}
            className="flex min-h-11 items-center gap-3 rounded-row bg-surface-2 px-4"
          >
            <span aria-hidden="true" className="w-5 text-center text-muted">
              {icon}
            </span>
            {label}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        You can bring back roles you passed once the deck is empty.
      </p>
      <Button ref={ctaRef} onClick={close} className="w-full">
        Got it
      </Button>
    </dialog>
  );
}
