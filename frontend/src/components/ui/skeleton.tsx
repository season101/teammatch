// A block in the shape of the content while it loads (feedback-states.md). No spinners.
// Size it with className, e.g. "h-4 w-2/3". Hidden from screen readers; put role="status"
// with a label on the wrapper.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-input bg-surface-2 motion-safe:animate-pulse ${className}`}
    />
  );
}

// A list of rows loading: the usual case for applications, projects and teams.
export function SkeletonRows({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-row bg-surface p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
