const styles = {
  filled: "bg-apply",
  open: "border border-muted",
  // The role on this card.
  current: "bg-primary motion-safe:animate-pulse",
};

export type Segment = keyof typeof styles;

export function TeamStrip({ segments }: { segments: Segment[] }) {
  const filled = segments.filter((segment) => segment === "filled").length;
  return (
    <div
      role="img"
      aria-label={`${filled} of ${segments.length} roles filled`}
      className="flex gap-1"
    >
      {segments.map((segment, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-pill ${styles[segment]}`}
        />
      ))}
    </div>
  );
}
