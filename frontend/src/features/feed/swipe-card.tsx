"use client";

import {
  animate,
  motion,
  useDragControls,
  useIsPresent,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export type Direction = "left" | "right";

// Gesture numbers from docs/design/patterns/swipe-deck.md.
const COMMIT_SHARE = 0.3;
const FLING_SPEED = 600; // px/s, the spec's 0.6 px/ms
const FLING_MIN = 40;
const STANDARD = [0.2, 0.8, 0.2, 1] as const;
// A released card starts at the speed the finger had: a flick leaves fast, a slow drag settles.
const SPRING = { type: "spring", duration: 0.5, bounce: 0 } as const;

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

// Presses on these stay presses, never drags or taps on the card.
const CONTROLS = "a, button, input, label, select, textarea";

// Drag, stamps and fly-off for one card. What a commit or a tap does is up to the deck.
export function SwipeCard({
  isTop,
  returning = false,
  follow,
  onCommit,
  onTap,
  children,
}: {
  isTop: boolean;
  // An undone pass: the card comes back in from the left, the way it went.
  returning?: boolean;
  // Shared by the deck's cards: how far the top card is dragged, 0 to 1 at the commit distance.
  follow: MotionValue<number>;
  onCommit: (direction: Direction) => void;
  onTap: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Set once a drag starts, so the click that ends it isn't a tap.
  const dragged = useRef(false);
  const controls = useDragControls();
  // False while the card flies off, so it can't be dragged or clicked again.
  const isPresent = useIsPresent();
  const reduce = useReducedMotion();
  const x = useMotionValue(returning && !reduce ? -600 : 0);
  useEffect(() => {
    if (x.get() !== 0) animate(x, 0, SPRING);
  }, [x]);
  const y = useMotionValue(0);
  // distance / 20 degrees, capped at 15.
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const commitDistance = () => (ref.current?.offsetWidth ?? 0) * COMMIT_SHARE || 1;
  // CSS clamps opacity to 0..1, so the far side just stays hidden.
  const applyOpacity = useTransform(x, (v) => v / commitDistance());
  const passOpacity = useTransform(x, (v) => -v / commitDistance());
  const active = isTop && isPresent;

  // The card underneath comes forward as the top one is dragged away. Its outer scale
  // stays at 0.96 (the `animate` below), so this inner one runs from 1 to 1/0.96 and
  // the two meet at full size. When this card becomes the top one, the inner scale
  // eases back to 1 while the outer eases up, so the hand-over doesn't jump.
  const lift = useMotionValue(1);
  useMotionValueEvent(x, "change", (v) => {
    if (active && !reduce) follow.set(Math.min(1, Math.abs(v) / commitDistance()));
  });
  useMotionValueEvent(follow, "change", (v) => {
    if (!isTop && isPresent) lift.set(1 + (1 / 0.96 - 1) * v);
  });
  useEffect(() => {
    if (isTop) animate(lift, 1, { duration: 0.2, ease: STANDARD });
  }, [isTop, lift]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const direction = swipeDirection(
      info.offset.x,
      info.velocity.x,
      ref.current?.offsetWidth ?? 0,
    );
    if (direction) return onCommit(direction);
    if (reduce) {
      x.set(0);
      y.set(0);
      return;
    }
    animate(x, 0, { ...SPRING, velocity: info.velocity.x });
    animate(y, 0, { ...SPRING, velocity: info.velocity.y });
  }

  return (
    <motion.div
      ref={ref}
      aria-hidden={!active}
      inert={!active}
      className={`relative col-start-1 row-start-1 touch-pan-y select-none rounded-card shadow-card ${
        isPresent ? (isTop ? "z-10" : "") : isTop ? "z-20" : ""
      }`}
      style={{ x, y, rotate: reduce ? 0 : rotate }}
      animate={{ scale: isTop || reduce ? 1 : 0.96, opacity: isTop ? 1 : 0.7 }}
      transition={{ duration: 0.2, ease: STANDARD }}
      exit="gone"
      variants={{
        // Reduced motion: a 200ms cross-fade instead of the fly-off. So does the card
        // underneath when an undone one pushes it out of the two on show.
        gone: (direction: Direction) =>
          reduce || !isTop
            ? { opacity: 0 }
            : {
                x: direction === "right" ? 600 : -600,
                opacity: 0,
                // x picks up the drag's own speed; the fade keeps its 200ms.
                transition: { x: SPRING, opacity: { duration: 0.2, ease: STANDARD } },
              },
      }}
      drag={active}
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.25}
      dragMomentum={false}
      onPointerDown={(event) => {
        dragged.current = false;
        if (active && !(event.target as Element).closest(CONTROLS)) controls.start(event);
      }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onClick={(event) => {
        if (active && !dragged.current && !(event.target as Element).closest(CONTROLS)) onTap();
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
      <motion.div style={{ scale: lift }}>{children}</motion.div>
    </motion.div>
  );
}
