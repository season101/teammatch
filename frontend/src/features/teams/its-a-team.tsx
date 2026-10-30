"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { initials, termEnd } from "./my-team";
import { useMarkSeen, useMyTeam, type MyTeam } from "./queries";

const STANDARD = [0.2, 0.8, 0.2, 1] as const;
const STAGGER = 0.08;
const SLOW = 0.32;
const CONFETTI_FOR = 1.2;

// Fixed pieces so render stays pure. Every piece has landed by CONFETTI_FOR.
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.05,
  spin: i % 2 ? 360 : -360,
  color: ["bg-apply", "bg-on-primary", "bg-info", "bg-undo"][i % 4],
}));

// Shows "It's a Team!" once when my team's seen_at is empty, and marks it seen (DD-27).
// The owner gets here too: a locking like refetches my team.
export function TeamCelebration() {
  const { data: team } = useMyTeam();
  const { mutate: markSeen } = useMarkSeen();
  const [shown, setShown] = useState<MyTeam | null>(null);
  if (team?.seen_at === null && shown?.id !== team.id) setShown(team);

  useEffect(() => {
    if (shown) markSeen(shown.id);
  }, [shown, markSeen]);

  return shown && <ItsATeam team={shown} onClose={() => setShown(null)} />;
}

// Full screen, always dark. The native modal <dialog> traps focus and closes on Esc.
export function ItsATeam({ team, onClose }: { team: MyTeam; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  // Avatars first, then the title, then the confetti.
  const titleAt = team.members.length * STAGGER;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    ctaRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      data-theme="dark"
      className="m-0 size-full max-h-none max-w-none bg-spark text-on-primary"
    >
      {/* Darkened like the project covers, so white text stays above 4.5:1 on the pink end. */}
      <div className="relative flex min-h-full flex-col items-center justify-center gap-6 bg-black/25 px-4 py-12 text-center">
        {!reduce && <Confetti at={titleAt + SLOW} />}
        <p className="font-mono text-sm">
          {team.project.title} · {team.term.name}
        </p>
        <motion.h2
          id={titleId}
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: titleAt, duration: SLOW, ease: STANDARD }}
          className="font-display text-4xl font-black sm:text-5xl"
        >
          It&apos;s a <em>Team!</em>
        </motion.h2>
        <p className="max-w-sm">
          Every role is filled. You&apos;re a team until {termEnd(team)}.
        </p>
        <ul aria-label="Members" className="flex flex-wrap justify-center gap-3">
          {team.members.map((member, index) => (
            <motion.li
              key={index}
              initial={reduce ? false : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * STAGGER, duration: SLOW, ease: STANDARD }}
              className="flex w-20 flex-col items-center gap-1"
            >
              <span
                aria-hidden="true"
                className="grid size-14 place-items-center rounded-full bg-cta text-lg font-bold text-on-cta"
              >
                {initials(member.display_name)}
              </span>
              <span className="text-sm font-semibold">{member.display_name || "Unnamed"}</span>
              <span className="text-xs">{member.role}</span>
            </motion.li>
          ))}
        </ul>
        {/* Team chat is F4-08, so both go to the team for now. */}
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <Link
            ref={ctaRef}
            href="/teams"
            onClick={onClose}
            className={`${buttonClasses("cta")} w-full focus-visible:outline-on-primary`}
          >
            Open team chat
          </Link>
          <Link
            href="/teams"
            onClick={onClose}
            className={`${buttonClasses("ghost")} underline focus-visible:outline-on-primary`}
          >
            See the team
          </Link>
        </div>
      </div>
    </dialog>
  );
}

function Confetti({ at }: { at: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map((piece, index) => (
        <motion.span
          key={index}
          className={`absolute -top-4 h-3 w-1.5 rounded-sm ${piece.color}`}
          style={{ left: `${piece.left}%` }}
          animate={{ y: "110vh", rotate: piece.spin }}
          transition={{ delay: at + piece.delay, duration: CONFETTI_FOR - piece.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
