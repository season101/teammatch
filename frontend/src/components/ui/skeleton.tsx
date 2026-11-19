"use client";

import { useEffect, useState } from "react";

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

// "Still loading…" once a skeleton has been up for 10 seconds (feedback-states.md).
function StillLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10_000);
    return () => clearTimeout(timer);
  }, []);
  return slow ? <p className="text-sm text-muted">Still loading…</p> : null;
}

// A list of rows loading: the usual case for applications, projects and teams.
// tabs: the screen opens with a row of that many tabs, so the rows don't jump down
// when they arrive. meter: the profile's strength bar sits above them.
export function SkeletonRows({
  label,
  rows = 3,
  tabs = 0,
  meter = false,
}: {
  label: string;
  rows?: number;
  tabs?: number;
  meter?: boolean;
}) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {meter && (
        <div className="flex flex-col gap-2 pb-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-1.5 w-full rounded-pill" />
        </div>
      )}
      {tabs > 0 && (
        <div className="flex gap-4 pb-1">
          {Array.from({ length: tabs }, (_, i) => (
            <Skeleton key={i} className="h-11 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-row bg-surface p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
      <StillLoading />
    </div>
  );
}

// One card loading: the deck and the review queue.
export function SkeletonCard({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex w-full flex-col gap-3 rounded-card border border-border bg-surface p-5 ${className}`}
    >
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-1/2 rounded-pill" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <StillLoading />
    </div>
  );
}
