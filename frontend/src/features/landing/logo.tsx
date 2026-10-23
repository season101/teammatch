// Three seats and the wordmark. Sized by the font size you give it, so the
// header and the splash share one mark.
export function Logo({
  className = "",
  // Spark wordmark: only on the dark splash, where both gradient ends pass 3:1.
  spark = false,
}: {
  className?: string;
  spark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-[0.3em] font-display font-black ${className}`}
    >
      <span aria-hidden="true" className="flex gap-[0.08em]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            // --i staggers the splash fill; see .splash .seat in globals.css.
            style={{ "--i": i } as React.CSSProperties}
            className="seat h-[0.7em] w-[0.2em] rounded-[0.05em] bg-spark"
          />
        ))}
      </span>
      <span className={spark ? "bg-spark bg-clip-text text-transparent" : ""}>
        TeamMatch
      </span>
    </span>
  );
}
