export function MatchBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-apply px-2.5 py-0.5 font-mono text-xs font-semibold text-on-apply">
      {Math.round(percent)}% match
    </span>
  );
}
