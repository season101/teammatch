import type { ReactNode } from "react";

// What a screen shows when there's nothing to show, or the load failed (empty-state.md).
// Says why it's empty and what to do next; errors use the same layout with Retry.
export function EmptyState({
  icon,
  title,
  children,
  action,
  secondaryAction,
  heading: Heading = "h2",
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  // h1 when it is the whole page (not found, failed load of the page's subject).
  heading?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="mb-1 grid size-16 place-items-center rounded-card border border-dashed border-border text-muted"
        >
          {icon}
        </span>
      )}
      <Heading className="font-display text-[28px] leading-tight font-bold">{title}</Heading>
      {children && <p className="max-w-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
      {secondaryAction}
    </div>
  );
}
