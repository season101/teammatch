"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MatchBadge } from "@/components/ui/match-badge";
import { noticeClass } from "@/components/ui/form-classes";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatusChip } from "@/features/applications/my-applications";
import { useMyApplications } from "@/features/applications/queries";
import { NoteField } from "@/features/feed/note-field";
import { useApply, useDismiss, type ApiError } from "@/features/feed/queries";
import { deckHandoff } from "@/features/feed/role-card";
import { useMyProfile, useMyRole, useSkills } from "@/features/profiles/queries";
import { ProjectEditor, RepoAndDetails } from "./project-editor";
import { useProject } from "./queries";

const labelClass = "text-xs font-semibold tracking-wide text-muted uppercase";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={labelClass}>{title}</h2>
      {children}
    </section>
  );
}

// From the deck, Back steps back to it in history, so the cached feed shows the same
// card. Opened from a link or after a reload there's no deck behind it: go to Discover.
// Only once: a decision that lands after I pressed Back, or left the page, stays put.
function useBackToDeck(roleId: number) {
  const router = useRouter();
  const [fromDeck] = useState(() => deckHandoff.opened === roleId);
  const left = useRef(false);
  useEffect(() => {
    deckHandoff.opened = null;
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);
  return useCallback(() => {
    if (left.current) return;
    left.current = true;
    deckHandoff.returning = true;
    if (fromDeck) router.back();
    else router.push("/feed");
  }, [fromDeck, router]);
}

// The role details page (F3-13, DD-39): the project page focused on the role a deck card
// opened, at /projects/<id>?role=<role id>. Apply or Pass here, with the note (DD-40),
// then back to the deck on the next card. A role that isn't on the project shows the
// whole project page instead.
export function RoleDetails({
  projectId,
  roleId,
  userId,
}: {
  projectId: number;
  roleId: number;
  userId: number;
}) {
  const project = useProject(projectId);
  const skills = useSkills();
  // Only to tick the skills I have, so nothing waits for it.
  const mySkillIds = useMyProfile().data?.skills.map((skill) => skill.id) ?? [];
  const applications = useMyApplications();
  const myRole = useMyRole(); // moderators and admins don't apply or pass
  const apply = useApply();
  const dismiss = useDismiss();
  const back = useBackToDeck(roleId);
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const noteBox = useRef<HTMLDivElement>(null);

  const role = project.data?.roles.find((each) => each.id === roleId);

  // Focused on the role: keyboard and screen reader users start at its title.
  const shown = Boolean(role && skills.data);
  useEffect(() => {
    if (shown) heading.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (noting) noteBox.current?.querySelector("textarea")?.focus();
  }, [noting]);

  // Esc goes back, unless it's for a text field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if ((event.target as Element).closest?.("input, textarea, select")) return;
      back();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [back]);

  if (project.isPending || skills.isPending) {
    return <SkeletonRows label="Loading the role" rows={6} />;
  }
  if (project.isError || skills.isError) {
    // Same not-found and retry screen as the project page.
    return <ProjectEditor projectId={projectId} userId={userId} />;
  }
  if (!role) return <ProjectEditor projectId={projectId} userId={userId} />;

  const data = project.data;
  const skillName = (id: number) =>
    skills.data.find((skill) => skill.id === id)?.name ?? "Unknown skill";
  // This role is the page's subject, so it's only listed once someone fills it.
  const others = data.roles.filter((each) => each !== role || each.status === "filled");
  const busy = apply.isPending || dismiss.isPending;

  async function decide(to: "apply" | "pass") {
    setError("");
    try {
      if (to === "apply") await apply.mutateAsync({ role: roleId, note: note.trim() });
      else await dismiss.mutateAsync(roleId);
    } catch (err) {
      setError((err as ApiError).message);
      // 409: the role just filled or closed, or I'd already applied. Show what's true now.
      if ((err as ApiError).status === 409) {
        void applications.refetch();
        void project.refetch();
      }
      return;
    }
    back();
  }

  const alert = error ? (
    <p role="alert" className={noticeClass}>
      {error}
    </p>
  ) : null;
  const applied =
    applications.data?.find((application) => application.role.id === roleId)?.status ??
    (apply.isSuccess ? apply.data.status : undefined);

  // Apply and Pass aren't offered on my own project, a role I applied to or a filled one.
  let decision: ReactNode;
  if (data.owner === userId || applications.isPending || (myRole && myRole !== "student")) {
    decision = alert;
  } else if (applied) {
    decision = (
      <>
        <p className="flex items-center gap-2 text-sm">
          <span className="font-medium">Applied</span>
          <StatusChip status={applied} />
        </p>
        {alert}
      </>
    );
  } else if (data.status !== "open" || role.status !== "open") {
    decision = (
      <>
        <p className="text-sm text-muted">This role is filled.</p>
        {alert}
      </>
    );
  } else {
    decision = (
      // Pinned just above the phone tab bar (3.5rem), at the bottom on larger screens.
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 border-t border-border bg-bg px-4 py-3 sm:bottom-0 sm:-mx-6 sm:px-6">
        {alert}
        {noting && (
          <div ref={noteBox}>
            <NoteField roleId={roleId} note={note} onNoteChange={setNote} />
          </div>
        )}
        <div className="flex items-center gap-3">
          {!noting && (
            <button
              type="button"
              className={buttonClasses("secondary", "sm")}
              onClick={() => setNoting(true)}
            >
              Add a note
            </button>
          )}
          <span className="flex-1" />
          <ActionButton
            kind="pass"
            label={`Pass on ${role.title}`}
            disabled={busy}
            onClick={() => decide("pass")}
          />
          <ActionButton
            kind="apply"
            label={`Apply to ${role.title} on ${data.title}`}
            disabled={busy}
            onClick={() => decide("apply")}
          />
        </div>
      </div>
    );
  }

  const have = role.required_skills.filter((id) => mySkillIds.includes(id)).length;
  const seatRow = "flex min-h-11 items-center justify-between gap-3 py-1.5";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/feed"
        className="self-start text-sm text-primary hover:underline"
        onClick={(event) => {
          event.preventDefault();
          back();
        }}
      >
        <span aria-hidden="true">‹ </span>Back to the deck
      </Link>

      <header className="flex flex-col gap-1">
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display text-3xl font-extrabold focus:outline-none"
        >
          {role.title}
        </h1>
        <p className="text-sm text-muted">
          {data.title} · by {data.owner_name || "a classmate"}
        </p>
        {/* The same match the card showed, with its basis (match-badge.md). */}
        {role.required_skills.length > 0 && mySkillIds.length > 0 && (
          <p className="flex items-center gap-2 pt-1 text-sm text-muted">
            <MatchBadge percent={(have / role.required_skills.length) * 100} />
            {have} of {role.required_skills.length} skills
          </p>
        )}
      </header>

      {role.required_skills.length > 0 && (
        <Section title="Skills this role needs">
          <ul aria-label={`Skills for ${role.title}`} className="flex flex-wrap gap-2">
            {role.required_skills.map((id) => (
              <li key={id}>
                <Chip variant={mySkillIds.includes(id) ? "matched" : "default"}>
                  {skillName(id)}
                </Chip>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {role.description && (
        <Section title="About this role">
          <p className="whitespace-pre-line text-text">{role.description}</p>
        </Section>
      )}

      <Section title="About the project">
        <p className="whitespace-pre-line text-text">{data.pitch}</p>
      </Section>

      <RepoAndDetails project={data} />

      <Section title="Team so far">
        <ul className="flex flex-col divide-y divide-border text-text">
          <li className={seatRow}>
            <span>{data.owner_name || "The owner"}</span>
            <span className="text-sm text-muted">Owner</span>
          </li>
          {others.map((each) => (
            <li key={each.id} className={seatRow}>
              <span>
                {each.title}
                {each.status === "filled" && (
                  <span className="text-muted"> · {each.filled_by_name || "A classmate"}</span>
                )}
              </span>
              {each.status === "filled" ? (
                <span className="text-sm font-medium text-apply-text">Filled</span>
              ) : (
                <span className="text-sm text-muted">Open</span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {decision}
    </div>
  );
}
