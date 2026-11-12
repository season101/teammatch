"use client";

import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { useMyProfile } from "@/features/profiles/queries";
import { useShortcutsEnabled } from "@/features/shell/preferences";
import { termEnd } from "@/features/teams/my-team";
import { useMyTeam } from "@/features/teams/queries";
import { useApply, useDismiss, useFeed, useResetPasses, type ApiError } from "./queries";
import { RoleCard, roleHref } from "./role-card";
import { SwipeCard, type Direction } from "./swipe-card";

export function Feed() {
  const router = useRouter();
  const feed = useFeed();
  // A seat on a team this term means I'm benched (BR-09). The shell loads it too.
  const team = useMyTeam();
  // Only used to highlight matching skills, so the feed doesn't wait for it.
  const profile = useMyProfile();
  const mySkillIds = profile.data?.skills.map((skill) => skill.id) ?? [];
  const apply = useApply();
  const dismiss = useDismiss();
  const reset = useResetPasses();
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
    return <p className="text-muted">Loading open roles…</p>;
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
        {/* Becomes Open team chat once chat ships. */}
        <Link href="/teams" className={`${buttonClasses()} mt-3`}>
          See your team
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
        await apply.mutateAsync({ role: role.id });
        message = `Applied to ${role.title} at ${role.project.title}.`;
      } else {
        await dismiss.mutateAsync(role.id);
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
    if (!top || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
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
    <div className="flex flex-col gap-4" onKeyDown={onKeyDown}>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {error && (
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}
      <div
        ref={stack}
        role="group"
        aria-label="Deck of open roles"
        aria-keyshortcuts={shortcuts ? "ArrowLeft ArrowRight ArrowUp" : undefined}
        tabIndex={top ? 0 : -1}
        className="isolate grid grid-cols-1 rounded-card"
      >
        <AnimatePresence initial={false} custom={direction}>
          {deck.slice(0, 2).map((role) => (
            <SwipeCard
              key={role.id}
              isTop={role === top}
              onCommit={commit}
              onTap={() => router.push(roleHref(role))}
            >
              <RoleCard role={role} mySkillIds={mySkillIds} />
            </SwipeCard>
          ))}
        </AnimatePresence>
        {!top &&
          (feed.isFetching ? (
            <p className="col-start-1 row-start-1 text-muted">Loading open roles…</p>
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
      {top && (
        <div className="flex items-center justify-center gap-3">
          <ActionButton kind="pass" label={`Pass on ${top.title}`} onClick={() => commit("left")} />
          <ActionButton
            kind="apply"
            label={`Apply to ${top.title} on ${top.project.title}`}
            onClick={() => commit("right")}
          />
        </div>
      )}
    </div>
  );
}
