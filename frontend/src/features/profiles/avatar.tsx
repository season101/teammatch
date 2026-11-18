"use client";

import { useRef } from "react";
import { buttonClasses } from "@/components/ui/button";

export function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]);
  return letters.join("").toUpperCase() || "?";
}

// A person's photo (F1-07), or their initials without one. The photo is a button that
// opens it larger; the initials are decorative, since the name is always beside them.
// Size and colours come from className, so it fits each card.
export function Avatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!url) {
    return (
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full font-bold ${className}`}
      >
        {initials(name)}
      </span>
    );
  }
  const label = name ? `${name}'s photo` : "Photo";
  return (
    <>
      <button
        type="button"
        aria-label={`Open ${label}`}
        // The ::after pads small avatars out to a 44px tap target.
        className={`relative shrink-0 cursor-zoom-in rounded-full after:absolute after:-inset-1 after:content-[''] ${className}`}
        onClick={() => dialog.current?.showModal()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- our API streams it with the session cookie; next/image would refetch it without one */}
        <img src={url} alt="" className="size-full rounded-full object-cover" />
      </button>
      {/* The native modal <dialog> traps focus, closes on Esc and returns focus. */}
      <dialog
        ref={dialog}
        aria-label={label}
        // A click on the backdrop lands on the dialog itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto rounded-sheet border border-border bg-surface p-4 text-text shadow-modal backdrop:bg-scrim"
      >
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- same as above */}
          <img
            src={url}
            alt={label}
            loading="lazy"
            className="max-h-[70dvh] max-w-full rounded-card object-contain"
          />
          <button
            type="button"
            className={buttonClasses("secondary", "sm")}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
