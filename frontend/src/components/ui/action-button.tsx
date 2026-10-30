import type { ButtonHTMLAttributes } from "react";

// Pass and Apply are the big decisions (64px); Undo and Details are small (48px).
const kinds = {
  undo: {
    label: "Undo",
    big: false,
    look: "border border-border bg-surface text-undo",
    path: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  },
  pass: {
    label: "Pass",
    big: true,
    look: "border-2 border-pass text-pass",
    path: "M6 6l12 12M18 6 6 18",
  },
  details: {
    label: "Details",
    big: false,
    look: "border border-border bg-surface text-info",
    path: "M12 11v6M12 7h.01",
  },
  apply: {
    label: "Apply",
    big: true,
    // The apply-text border vanishes on dark lime and is the light-theme ring.
    look: "border border-apply-text bg-apply text-on-apply shadow-card",
    path: "m5 12.5 4.5 4.5L19 7",
  },
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  kind: keyof typeof kinds;
  // Overrides the accessible name, e.g. "Apply to Frontend dev".
  label?: string;
};

export function ActionButton({ kind, label, className = "", ...props }: Props) {
  const { label: defaultLabel, big, look, path } = kinds[kind];
  return (
    <button
      type="button"
      aria-label={label ?? defaultLabel}
      className={`grid shrink-0 place-items-center rounded-full transition duration-fast ease-standard disabled:opacity-40 aria-disabled:opacity-40 motion-safe:enabled:hover:scale-106 motion-safe:focus-visible:scale-106 motion-safe:enabled:active:scale-95 ${big ? "size-16" : "size-12"} ${look} ${className}`}
      {...props}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={big ? "size-8" : "size-6"}
      >
        {kind === "details" && <circle cx="12" cy="12" r="9" />}
        <path d={path} />
      </svg>
    </button>
  );
}
