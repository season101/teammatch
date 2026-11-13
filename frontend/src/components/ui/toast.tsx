import type { ReactNode } from "react";

// shortcut: no queue or auto-dismiss, and screen readers may skip a status
// region that mounts with its text; add a toast provider when the app needs one.
export function Toast({
  title,
  children,
  onDismiss,
}: {
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex w-full max-w-sm items-start gap-3 rounded-row border border-border bg-surface p-4 text-text shadow-card motion-safe:animate-toast-in motion-reduce:animate-fade-in"
    >
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          // 32px to look at, 44px to hit.
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text relative after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] after:size-11"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
