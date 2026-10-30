"use client";

import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { useMyProfile } from "@/features/profiles/queries";
import { useShortcutsEnabled } from "@/features/shell/preferences";
import { NoteField } from "./note-field";
import { useApply, useDismiss, useFeed, type ApiError } from "./queries";
import { RoleCard } from "./role-card";
import { SwipeCard, type Direction } from "./swipe-card";

export function Feed() {
  const feed = useFeed();
  // Only used to highlight matching skills, so the feed doesn't wait for it.
  const profile = useMyProfile();
  const mySkillIds = profile.data?.skills.map((skill) => skill.id) ?? [];
  const apply = useApply();
  const dismiss = useDismiss();
  // Roles decided here. They leave the deck at once and come back if the request fails.
  const [gone, setGone] = useState<number[]>([]);
  const [direction, setDirection] = useState<Direction>("right");
  const [note, setNote] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  // True while a decision is being sent. The buttons and keys wait for it.
  const [busy, setBusy] = useState(false);
  const shortcuts = useShortcutsEnabled();
  const stack = useRef<HTMLDivElement>(null);

  if (feed.isPending) {
    return <p className="text-muted">Loading open roles…</p>;
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

  // Right applies with the typed note, left passes. Drags, the ✕/✓ buttons and
  // the arrow keys all end up here.
  async function commit(to: Direction) {
    if (!top) return;
    const role = top;
    const sent = note.trim();
    setBusy(true);
    setDirection(to);
    setGone((ids) => [...ids, role.id]);
    setNote("");
    setError("");
    try {
      let message;
      if (to === "right") {
        await apply.mutateAsync({ role: role.id, note: sent });
        message = `Applied to ${role.title} at ${role.project.title}.`;
      } else {
        await dismiss.mutateAsync(role.id);
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
      if (status !== 409) {
        setGone((ids) => ids.filter((id) => id !== role.id));
        setNote((current) => current || sent);
      }
    } finally {
      setBusy(false);
    }
  }

  // ← and → anywhere in the deck, but not while typing the note. Modifiers are
  // left alone (Alt+← is Back), and a held key doesn't keep deciding.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const to = event.key === "ArrowRight" ? "right" : event.key === "ArrowLeft" ? "left" : null;
    const target = event.target as Element;
    if (!to || !top || !shortcuts || busy || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (target.matches("input, textarea, select")) return;
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
        aria-keyshortcuts={shortcuts ? "ArrowLeft ArrowRight" : undefined}
        tabIndex={top ? 0 : undefined}
        className="isolate grid rounded-card"
      >
        <AnimatePresence initial={false} custom={direction}>
          {deck.slice(0, 2).map((role) => (
            <SwipeCard key={role.id} isTop={role === top} onCommit={commit}>
              <RoleCard role={role} mySkillIds={mySkillIds}>
                {role === top && (
                  <NoteField roleId={role.id} note={note} onNoteChange={setNote} />
                )}
              </RoleCard>
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
              <Link href="/projects" className={`${buttonClasses()} mt-3`}>
                Browse projects
              </Link>
            </div>
          ))}
      </div>
      {/* aria-disabled, not disabled: Chrome drops focus from a button that gets disabled. */}
      {top && (
        <div className="flex items-center justify-center gap-3">
          <ActionButton
            kind="pass"
            label={`Pass on ${top.title}`}
            aria-disabled={busy}
            onClick={() => !busy && commit("left")}
          />
          <ActionButton
            kind="apply"
            label={`Apply to ${top.title} on ${top.project.title}`}
            aria-disabled={busy}
            onClick={() => !busy && commit("right")}
          />
        </div>
      )}
    </div>
  );
}
