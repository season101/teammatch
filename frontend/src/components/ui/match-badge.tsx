export function MatchBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-border bg-surface-2 px-2.5 py-0.5 font-mono text-xs font-medium text-text">
      {Math.round(percent)}% match
    </span>
  );
}
