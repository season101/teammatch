"use client";

import {
  animate,
  motion,
  useDragControls,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useRef, type ReactNode } from "react";

export type Direction = "left" | "right";

// Gesture numbers from docs/design/patterns/swipe-deck.md.
const COMMIT_SHARE = 0.3;
const FLING_SPEED = 600; // px/s, the spec's 0.6 px/ms
const FLING_MIN = 40;
const STANDARD = [0.2, 0.8, 0.2, 1] as const;

// Where a released drag goes: past 30% of the width, or a fling the same way.
export function swipeDirection(
  offset: number,
  velocity: number,
  width: number,
): Direction | null {
  const far = Math.abs(offset) >= width * COMMIT_SHARE;
  const fling =
    Math.abs(velocity) > FLING_SPEED &&
    Math.abs(offset) >= FLING_MIN &&
    velocity * offset > 0;
  if (offset === 0 || !(far || fling)) return null;
  return offset > 0 ? "right" : "left";
}

// On the trailing corner, so a phone doesn't push the stamp off-screen as the card leaves.
const stampClass =
  "pointer-events-none absolute top-6 z-10 rounded-input border-4 border-current px-3 font-display text-3xl font-extrabold tracking-wider";

// Drag, stamps and fly-off for one card. What a commit does is up to the deck.
export function SwipeCard({
  isTop,
  onCommit,
  children,
}: {
  isTop: boolean;
  onCommit: (direction: Direction) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  // False while the card flies off, so it can't be dragged or clicked again.
  const isPresent = useIsPresent();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // distance / 20 degrees, capped at 15.
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const commitDistance = () => (ref.current?.offsetWidth ?? 0) * COMMIT_SHARE || 1;
  // CSS clamps opacity to 0..1, so the far side just stays hidden.
  const applyOpacity = useTransform(x, (v) => v / commitDistance());
  const passOpacity = useTransform(x, (v) => -v / commitDistance());
  const active = isTop && isPresent;

  function onDragEnd(_: unknown, info: PanInfo) {
    const direction = swipeDirection(
      info.offset.x,
      info.velocity.x,
      ref.current?.offsetWidth ?? 0,
    );
    if (direction) return onCommit(direction);
    const back = reduce ? { duration: 0 } : { duration: 0.32, ease: STANDARD };
    animate(x, 0, back);
    animate(y, 0, back);
  }

  return (
    <motion.div
      ref={ref}
      aria-hidden={!active}
      inert={!active}
      className={`relative col-start-1 row-start-1 touch-pan-y select-none rounded-card shadow-card ${
        isPresent ? (isTop ? "z-10" : "") : "z-20"
      }`}
      style={{ x, y, rotate: reduce ? 0 : rotate }}
      animate={{ scale: isTop || reduce ? 1 : 0.96, opacity: isTop ? 1 : 0.7 }}
      transition={{ duration: 0.2, ease: STANDARD }}
      exit="gone"
      variants={{
        // Reduced motion: a 200ms cross-fade instead of the fly-off.
        gone: (direction: Direction) =>
          reduce ? { opacity: 0 } : { x: direction === "right" ? 600 : -600, opacity: 0 },
      }}
      drag={active}
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.25}
      dragMomentum={false}
      onPointerDown={(event) => {
        // Presses on the card's buttons and fields stay presses, never drags.
        const target = event.target as Element;
        if (active && !target.closest("a, button, input, label, select, textarea")) {
          controls.start(event);
        }
      }}
      onDragEnd={onDragEnd}
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: applyOpacity }}
        className={`${stampClass} left-6 -rotate-12 text-apply-text`}
      >
        APPLY
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: passOpacity }}
        className={`${stampClass} right-6 rotate-12 text-pass`}
      >
        PASS
      </motion.span>
      {children}
    </motion.div>
  );
}
