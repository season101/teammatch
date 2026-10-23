import type { ReactNode } from "react";

const variants = {
  default: "border-border bg-surface-2 text-muted",
  // Lime means "yes": a skill you have that the role wants.
  matched: "border-apply bg-apply text-on-apply",
  // Pickers only.
  selected: "border-primary bg-primary/16 text-text",
};

type Props = {
  children: ReactNode;
  variant?: keyof typeof variants;
  // Shows a × button; its label is "Remove <removeLabel>".
  onRemove?: () => void;
  removeLabel?: string;
  // Pill in pickers; the 6px chip radius is for chips inside cards.
  pill?: boolean;
};

export function Chip({
  children,
  variant = "default",
  onRemove,
  removeLabel = typeof children === "string" ? children : "item",
  pill = false,
}: Props) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1 border px-2.5 text-sm font-medium ${pill ? "rounded-pill" : "rounded-chip"} ${onRemove ? "pr-0.5" : ""} ${variants[variant]}`}
    >
      {variant === "matched" && <span aria-hidden="true">✓</span>}
      {children}
      {variant === "matched" && <span className="sr-only">(matched)</span>}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${removeLabel}`}
          onClick={onRemove}
          className={`grid size-6 place-items-center opacity-70 hover:opacity-100 ${pill ? "rounded-pill" : "rounded-chip"}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
