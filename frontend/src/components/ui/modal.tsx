"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

type Props = {
  open: boolean;
  // Called when the dialog closes: on Esc, or when `open` turns false.
  onClose: () => void;
  title: string;
  children?: ReactNode;
  // The safe choice is the white pill and gets focus first.
  ctaLabel: string;
  onCta: () => void;
  escapeLabel: string;
  onEscape?: () => void;
};

// A gate: one CTA (the safe choice) plus a danger text button as the escape.
// The native modal <dialog> makes the rest of the page inert (the focus trap),
// closes on Esc and returns focus.
export function Modal({
  open,
  onClose,
  title,
  children,
  ctaLabel,
  onCta,
  escapeLabel,
  onEscape = onClose,
}: Props) {
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-sheet border border-border bg-surface p-6 text-center text-text shadow-modal backdrop:bg-scrim open:motion-safe:animate-toast-in open:motion-reduce:animate-fade-in"
    >
      <h2 id={titleId} className="font-display text-2xl font-extrabold">
        {title}
      </h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Button ref={ctaRef} onClick={onCta} className="w-full">
          {ctaLabel}
        </Button>
        <Button variant="danger" onClick={onEscape}>
          {escapeLabel}
        </Button>
      </div>
    </dialog>
  );
}
