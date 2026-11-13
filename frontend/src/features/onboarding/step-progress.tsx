// Four thin pills, filled up to the current step. Shared by the welcome screens and the coach marks.
export function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-pill bg-border">
            {/* The step just reached fills from the left; the ones before it are already full. */}
            {n <= step && (
              <span
                className={`block h-full origin-left bg-primary ${n === step ? "motion-safe:animate-fill-in" : ""}`}
              />
            )}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted">Step {step} of 4</p>
    </div>
  );
}
