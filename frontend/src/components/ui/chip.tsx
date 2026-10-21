import type { ReactNode } from "react";

const variants = {
  default: "border-border bg-surface-2 text-text",
  // Lime means "yes": a skill you have that the role wants.
  matched: "border-apply bg-apply text-on-apply",
  selected: "border-primary bg-primary/20 text-text",
};

type Props = {
  children: ReactNode;
  variant?: keyof typeof variants;
  // Shows a × button; its label is "Remove <removeLabel>".
  onRemove?: () => void;
  removeLabel?: string;
};

export function Chip({
  children,
  variant = "default",
  onRemove,
  removeLabel = typeof children === "string" ? children : "item",
}: Props) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1 rounded-chip border px-2.5 text-sm font-medium ${onRemove ? "pr-0.5" : ""} ${variants[variant]}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${removeLabel}`}
          onClick={onRemove}
          className="grid size-6 place-items-center rounded-chip opacity-70 hover:opacity-100"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
