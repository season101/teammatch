export function ProfileStrength({
  value,
  label = "Profile strength",
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-text">{label}</span>
        <span className="font-mono text-muted">{percent}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-pill bg-surface-2"
      >
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-slow ease-standard"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
