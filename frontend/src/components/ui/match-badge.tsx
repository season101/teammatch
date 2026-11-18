export function MatchBadge({ percent }: { percent: number }) {
  // Lime means "yes" (README rule 1), so a match under half is a neutral chip.
  const tone =
    percent >= 50
      ? "bg-apply text-on-apply"
      : "border border-border bg-surface-2 text-muted";
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-xs font-semibold ${tone}`}
    >
      {Math.round(percent)}% match
    </span>
  );
}
