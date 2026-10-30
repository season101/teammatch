"use client";

import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useMyProfile } from "@/features/profiles/queries";
import { ApplyForm } from "./apply-form";
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

  // Right applies with the typed note, left passes. Drags and the card's buttons
  // both end up here, and F3-09's button row and arrow keys can too.
  async function commit(to: Direction) {
    if (!top) return;
    const role = top;
    const sent = note.trim();
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
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {error && (
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}
      <div className="isolate grid">
        <AnimatePresence initial={false} custom={direction}>
          {deck.slice(0, 2).map((role) => (
            <SwipeCard key={role.id} isTop={role === top} onCommit={commit}>
              <RoleCard role={role} mySkillIds={mySkillIds}>
                {role === top && (
                  <>
                    <ApplyForm
                      roleId={role.id}
                      note={note}
                      onNoteChange={setNote}
                      onApply={() => commit("right")}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="self-start"
                      onClick={() => commit("left")}
                    >
                      Pass
                    </Button>
                  </>
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
    </div>
  );
}
