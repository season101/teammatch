"use client";

import { AnimatePresence, useMotionValue } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { useBump } from "@/components/ui/bump";
import { buttonClasses } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useMyApplications } from "@/features/applications/queries";
import { useMyProfile } from "@/features/profiles/queries";
import { useShortcutsEnabled } from "@/features/shell/preferences";
import { useMySummary } from "@/features/shell/queries";
import { termEnd } from "@/features/teams/my-team";
import { useMyTeam } from "@/features/teams/queries";
import {
  useApply,
  useDismiss,
  useFeed,
  useResetPasses,
  useUndoPass,
  type ApiError,
  type FeedRole,
} from "./queries";
import { deckCardHeight, RoleCard, roleHref } from "./role-card";
import { SwipeCard, type Direction } from "./swipe-card";

export function Feed() {
  const router = useRouter();
  const feed = useFeed();
  // A seat on a team this term means I'm benched (BR-09). The shell loads it too.
  const team = useMyTeam();
  // My offers, and whether a commit closed my deck (F4-11). The shell loads it too.
  const summary = useMySummary().data;
  const committed = summary?.deck === "committed";
  const offersBump = useBump(summary?.offers);
  // How far the top card is dragged; the card under it grows with it.
  const follow = useMotionValue(0);
  // Only to name the project I committed to.
  const seat = useMyApplications(committed).data?.find((a) => a.status === "committed");
  // Only used to highlight matching skills, so the feed doesn't wait for it.
  const profile = useMyProfile();
  const mySkillIds = profile.data?.skills.map((skill) => skill.id) ?? [];
  const apply = useApply();
  const dismiss = useDismiss();
  const reset = useResetPasses();
  const undoPass = useUndoPass();
  // The role I passed on, while that pass is still my last decision here. Undo brings
  // back this one only (F3-10). `sent` is its request, which an undo has to wait for.
  const [lastPass, setLastPass] = useState<{ role: FeedRole; sent: Promise<void> } | null>(null);
  // The undone role, so its card flies back in from the left.
  const [returning, setReturning] = useState<number | null>(null);
  // Set when a reset brought nothing back.
  const [noPasses, setNoPasses] = useState(false);
  // Roles decided here. They leave the deck at once and come back if the request fails.
  const [gone, setGone] = useState<number[]>([]);
  const [direction, setDirection] = useState<Direction>("right");
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const shortcuts = useShortcutsEnabled();
  const stack = useRef<HTMLDivElement>(null);

  if (feed.isPending || team.isPending) {
    return <SkeletonCard label="Loading open roles" className={deckCardHeight} />;
  }
  if (team.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="font-display text-3xl font-extrabold">
          You&apos;re on {team.data.project.title}
        </h2>
        <p className="text-muted">
          You&apos;re on a team until {termEnd(team.data)}. Your other applications were
          withdrawn.
        </p>
        <Link href={`/teams/${team.data.id}/chat`} className={`${buttonClasses()} mt-3`}>
          Open team chat
        </Link>
      </div>
    );
  }
  // Not benched yet: the team locks, and chat opens, when the last role fills.
  if (committed) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="font-display text-3xl font-extrabold">
          You&apos;re committed to {seat?.role.project.title ?? "a project"}
        </h2>
        <p className="text-muted">
          Your deck stays closed while you hold this seat. Team chat opens when the last role
          fills.
        </p>
        <Link href="/applications" className={`${buttonClasses()} mt-3`}>
          See your commitment
        </Link>
      </div>
    );
  }
  if (feed.isError) {
    return (
      <p role="alert" className="text-pass">
        Couldn&apos;t load roles. Refresh the page to try again.
      </p>
    );
  }

  const offers = summary?.offers ?? 0;
  const deck = feed.data.filter((role) => !gone.includes(role.id));
  const top = deck[0];

  // Right applies, left passes. Drags, the ✕/✓ buttons and the arrow keys all end
  // up here. Nothing waits for the request, so the next card can be decided at once.
  async function commit(to: Direction) {
    if (!top) return;
    const role = top;
    setDirection(to);
    setGone((ids) => [...ids, role.id]);
    setError("");
    try {
      let message;
      if (to === "right") {
        // An apply can't be undone from the deck (BR-02), and it ends the last pass's turn.
        setLastPass(null);
        await apply.mutateAsync({ role: role.id });
        message = `Applied to ${role.title} at ${role.project.title}.`;
      } else {
        const sent = dismiss.mutateAsync(role.id);
        setLastPass({ role, sent });
        await sent;
        setNoPasses(false);
        message = `Passed on ${role.title}.`;
      }
      if (deck.length === 1) {
        const { data } = await feed.refetch();
        if (data?.length === 0) message += " You've seen every role for now.";
      }
      setAnnouncement(message);
    } catch (err) {
      const { status, message } = err as ApiError;
      setError(message);
      // 409: the role was filled or closed, or I already applied. Nothing to bring back.
      if (status !== 409) setGone((ids) => ids.filter((id) => id !== role.id));
      // A pass that didn't happen can't be undone.
      setLastPass((last) => (last?.role.id === role.id ? null : last));
    }
  }

  // Undo the last pass: the card comes back on top. Only that one (DD-17).
  async function undo() {
    if (!lastPass) return;
    const { role, sent } = lastPass;
    // The Undo button turns off, so focus waits on the deck for the card.
    stack.current?.focus();
    setLastPass(null);
    setError("");
    // The pass may still be on its way; taking it back has to land after it.
    await sent.catch(() => {});
    setReturning(role.id);
    setGone((ids) => ids.filter((id) => id !== role.id));
    try {
      await undoPass.mutateAsync(role);
      setAnnouncement(`${role.title} is back.`);
    } catch (err) {
      setError((err as ApiError).message);
    }
  }

  async function showPassedAgain() {
    // The button goes away either way. Focus waits on the deck for the cards.
    stack.current?.focus();
    setError("");
    try {
      await reset.mutateAsync();
    } catch (err) {
      setError((err as ApiError).message);
      return;
    }
    setGone([]);
    const { data } = await feed.refetch();
    if (data?.length === 0) {
      setNoPasses(true);
      setAnnouncement("No passed roles to bring back.");
    } else {
      setAnnouncement("Your passed roles are back.");
    }
  }

  // ←, → and ↑ anywhere in the deck. Modifiers are left alone (Alt+← is Back), and a
  // held key doesn't keep deciding. Enter opens details only from the deck itself, so
  // it still presses a focused button.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    // Z works on an empty deck too: the last card may be the one to bring back.
    if (shortcuts && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
      return;
    }
    if (!top) return;
    const open =
      (event.key === "Enter" && event.target === stack.current) ||
      (shortcuts && event.key === "ArrowUp");
    if (open) {
      event.preventDefault();
      router.push(roleHref(top));
      return;
    }
    const to = event.key === "ArrowRight" ? "right" : event.key === "ArrowLeft" ? "left" : null;
    if (!to || !shortcuts) return;
    event.preventDefault();
    // Focus inside the leaving card would drop to the page. The stack stays put.
    stack.current?.focus();
    commit(to);
  }

  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={onKeyDown}
      // The banner's height plus the gap under it; RoleCard takes it off its own height.
      style={offers > 0 ? ({ "--deck-banner": "5.25rem" } as CSSProperties) : undefined}
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {offers > 0 && (
        <Link
          href="/applications"
          className="flex min-h-11 items-center gap-3 rounded-row border border-primary bg-surface-2 px-4 py-3 hover:bg-surface"
        >
          <span
            aria-hidden="true"
            key={offersBump.key}
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-apply font-bold text-on-apply ${offersBump.className}`}
          >
            {offers}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">
              {offers === 1 ? "1 project wants you." : `${offers} projects want you.`}
            </span>
            <span className="block text-sm text-muted">
              Pick the one you want before it fills.
            </span>
          </span>
          <span aria-hidden="true" className="text-muted">
            ›
          </span>
        </Link>
      )}
      {error && (
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}
      <div
        ref={stack}
        role="group"
        aria-label="Deck of open roles"
        aria-keyshortcuts={shortcuts ? "ArrowLeft ArrowRight ArrowUp Z" : undefined}
        tabIndex={top ? 0 : -1}
        className="isolate grid grid-cols-1 rounded-card"
      >
        <AnimatePresence initial={false} custom={direction}>
          {deck.slice(0, 2).map((role) => (
            <SwipeCard
              key={role.id}
              isTop={role === top}
              returning={role.id === returning}
              follow={follow}
              onCommit={commit}
              onTap={() => router.push(roleHref(role))}
            >
              <RoleCard role={role} mySkillIds={mySkillIds} />
            </SwipeCard>
          ))}
        </AnimatePresence>
        {!top &&
          (feed.isFetching ? (
            <SkeletonCard label="Loading open roles" className={`col-start-1 row-start-1 ${deckCardHeight}`} />
          ) : (
            <div className="col-start-1 row-start-1 flex flex-col items-center gap-3 py-12 text-center">
              <h2 className="font-display text-3xl font-extrabold">
                You&apos;re all caught up
              </h2>
              <p className="text-muted">
                You&apos;ve seen every open role. New projects show up here first.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Link href="/projects" className={buttonClasses()}>
                  Browse projects
                </Link>
                {!noPasses && (
                  <button
                    type="button"
                    className={buttonClasses("secondary")}
                    aria-disabled={reset.isPending}
                    onClick={() => !reset.isPending && showPassedAgain()}
                  >
                    Show passed roles again
                  </button>
                )}
              </div>
              {noPasses && <p className="text-sm text-muted">No passed roles to bring back.</p>}
            </div>
          ))}
      </div>
      {(top || lastPass) && (
        <div className="flex items-center justify-center gap-3">
          <ActionButton
            kind="undo"
            label="Undo your last pass"
            disabled={!lastPass}
            onClick={undo}
          />
          {top && (
            <>
              <ActionButton
                kind="pass"
                label={`Pass on ${top.title}`}
                onClick={() => commit("left")}
              />
              <ActionButton
                kind="apply"
                label={`Apply to ${top.title} on ${top.project.title}`}
                onClick={() => commit("right")}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
