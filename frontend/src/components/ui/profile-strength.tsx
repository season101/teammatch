"use client";

import { useState } from "react";

export function ProfileStrength({
  value,
  label = "Profile strength",
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  // The number rolls up when it grows and down when it shrinks. Not on first paint.
  const [shown, setShown] = useState(percent);
  const [roll, setRoll] = useState("");
  if (shown !== percent) {
    setRoll(percent > shown ? "motion-safe:animate-roll-up" : "motion-safe:animate-roll-down");
    setShown(percent);
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-text">{label}</span>
        <span className="overflow-hidden font-mono text-muted tabular-nums">
          <span key={percent} className={`inline-block ${roll}`}>
            {percent}%
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-pill bg-surface-2"
      >
        {/* scaleX, not width: nothing is laid out again while it grows. */}
        <div
          className="h-full origin-left rounded-pill bg-apply-text transition-transform duration-slow ease-move motion-reduce:transition-none"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
    </div>
  );
}
