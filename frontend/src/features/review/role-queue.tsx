"use client";

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useProject } from "@/features/projects/queries";
import { initials } from "@/features/teams/my-team";
import { ApplicantCard } from "./applicant-card";
import {
  useApplicants,
  useDecide,
  type Applicant,
  type MyProject,
} from "./queries";

type Role = MyProject["roles"][number];

type QueueProps = {
  role: Role;
  projectId: number;
  // Open roles in the project besides this one, for "the other 2 roles".
  rolesToGo: number;
};

const nameOf = (application: Applicant) =>
  application.applicant.display_name || "Unnamed applicant";

// People with an offer out, or the ones a filled role closed on.
function People({ rows }: { rows: { application: Applicant; chip: string }[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map(({ application, chip }) => (
        <li key={application.id} className="flex min-h-11 items-center gap-3 py-2">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold"
          >
            {initials(nameOf(application))}
          </span>
          <span className="flex-1 font-semibold">{nameOf(application)}</span>
          <Chip>{chip}</Chip>
        </li>
      ))}
    </ul>
  );
}

// Who I'm waiting on for this role (screen 33). The role stays open until one commits.
function OffersOut({ roleId }: { roleId: number }) {
  const offers = useApplicants(roleId, "liked");
  if (!offers.data?.length) return null;
  const one = offers.data.length === 1;
  return (
    <section
      aria-labelledby={`offers-out-${roleId}`}
      className="flex flex-col gap-2 rounded-row border border-border bg-surface p-4"
    >
      <h3
        id={`offers-out-${roleId}`}
        className="text-xs font-semibold uppercase tracking-wider text-muted"
      >
        Offers out
      </h3>
      <People
        rows={offers.data.map((application) => ({ application, chip: "Waiting" }))}
      />
      <p className="text-sm text-muted">
        {one
          ? `If ${nameOf(offers.data[0])} takes another offer or declines`
          : "If they take other offers or decline"}
        , you can like someone else. The first person to commit gets the seat.
      </p>
    </section>
  );
}

// A filled role: who took the seat and what happened to the others (screen 34).
function FilledRole({ role, projectId, rolesToGo }: QueueProps) {
  const project = useProject(projectId);
  const passed = useApplicants(role.id, "passed");
  const declined = useApplicants(role.id, "declined");
  const name = project.data?.roles.find((other) => other.id === role.id)
    ?.filled_by_name;
  const others = [
    ...(passed.data ?? []).map((application) => ({ application, chip: "Closed" })),
    ...(declined.data ?? []).map((application) => ({ application, chip: "Declined" })),
  ];
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center">
        {name && (
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-full bg-apply text-lg font-bold text-on-apply"
          >
            {initials(name)}
          </span>
        )}
        {name && (
          <h3 className="font-display text-2xl font-extrabold">{name} committed</h3>
        )}
        <p className="text-muted">
          {role.title} is filled.
          {rolesToGo > 0 &&
            ` Your team locks when the other ${rolesToGo === 1 ? "role fills" : `${rolesToGo} roles fill`}.`}
        </p>
      </div>
      {others.length > 0 && (
        <section
          aria-labelledby={`others-${role.id}`}
          className="flex flex-col gap-2"
        >
          <h3 id={`others-${role.id}`} className="text-sm font-semibold text-muted">
            Other people on this role
          </h3>
          <People rows={others} />
        </section>
      )}
    </div>
  );
}

// What goes in the role tab: "Frontend developer 3", or a tick once the role is filled.
export function RoleTabLabel({ role }: { role: Role }) {
  return role.status === "filled" ? (
    <>
      {role.title} <span aria-label="filled">✓</span>
    </>
  ) : (
    <OpenRoleLabel role={role} />
  );
}

function OpenRoleLabel({ role }: { role: Role }) {
  const applicants = useApplicants(role.id);
  return (
    <>
      {role.title}
      {applicants.isSuccess && (
        <span className="ml-1.5 font-mono text-xs text-muted">
          {applicants.data.length}
        </span>
      )}
    </>
  );
}

const STANDARD = [0.2, 0.8, 0.2, 1] as const;
// --transition-duration-exit and --ease-exit.
const EXIT = { duration: 0.16, ease: [0.55, 0, 1, 0.45] } as const;
// A second press this soon after a decision is a double tap, not a choice about the next person.
const DOUBLE_TAP = 250;

// The card that is leaving can't be pressed again.
function Present({ children }: { children: ReactNode }) {
  return <div inert={!useIsPresent()}>{children}</div>;
}

// One role's queue: the first waiting applicant as a card, with Pass and Like.
export function RoleQueue(props: QueueProps) {
  return props.role.status === "filled" ? (
    <FilledRole {...props} />
  ) : (
    <OpenRoleQueue {...props} />
  );
}

function OpenRoleQueue({ role, projectId }: QueueProps) {
  const applicants = useApplicants(role.id);
  const decide = useDecide(role.id);
  const project = useProject(projectId);
  const requiredSkillIds =
    project.data?.roles.find((other) => other.id === role.id)
      ?.required_skills ?? [];
  const rootRef = useRef<HTMLDivElement>(null);
  const decidedAt = useRef(0);
  const reduce = useReducedMotion();
  const current = applicants.data?.[0];
  const name = current?.applicant.display_name || "Unnamed applicant";

  function decideOn(like: boolean) {
    if (!current || Date.now() - decidedAt.current < DOUBLE_TAP) return;
    decidedAt.current = Date.now();
    decide.mutate({ id: current.id, name, like });
  }

  // ← Pass and → Like (docs/design/patterns/review-queue.md). Skipped while typing, on a
  // role tab (the arrows switch tabs there), behind a dialog, or in a hidden role panel.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [role="tab"]')) return;
      if (document.querySelector("dialog[open]")) return;
      if (!rootRef.current || rootRef.current.closest("[hidden]")) return;
      if (!current) return;
      event.preventDefault();
      decideOn(event.key === "ArrowRight");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (applicants.isPending) {
    return <SkeletonCard label="Loading applicants" className="mx-auto mt-4 max-w-md" />;
  }
  if (applicants.isError) {
    return (
      <p role="alert" className="pt-4 text-sm text-pass">
        Couldn&apos;t load applicants. Refresh the page to try again.
      </p>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4 pt-4">
      {decide.variables && !decide.isError && (
        <p role="status" className="text-sm text-success">
          {decide.variables.like
            ? `Offer sent to ${decide.variables.name}. The role stays open until someone commits.`
            : `Passed on ${decide.variables.name}.`}
        </p>
      )}
      {decide.isError && (
        <p role="alert" className="text-sm text-pass">
          {decide.error.message}
        </p>
      )}

      {current && (
        <p className="text-sm text-muted">
          {role.title} · 1 of {applicants.data.length} waiting
        </p>
      )}
      {/* The decided card leaves on the press (a like drops toward Offers out, a pass
          goes left) while the next one comes in. popLayout takes it out of the flow. */}
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={decide.variables?.like}>
          {current && (
            <motion.div
              key={current.id}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, ease: STANDARD } }}
              exit="gone"
              variants={{
                gone: (liked: boolean) =>
                  reduce
                    ? { opacity: 0, transition: { duration: 0 } }
                    : liked
                      ? { opacity: 0, y: 48, scale: 0.9, transition: EXIT }
                      : { opacity: 0, x: -120, rotate: -6, transition: EXIT },
              }}
            >
              <Present>
                <ApplicantCard
                  application={current}
                  roleTitle={role.title}
                  requiredSkillIds={requiredSkillIds}
                  onLike={() => decideOn(true)}
                  onPass={() => decideOn(false)}
                />
              </Present>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!current && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-muted">No one&apos;s waiting for {role.title}.</p>
          <Link
            href={`/projects/${projectId}`}
            className={buttonClasses("secondary", "sm")}
          >
            Edit role
          </Link>
        </div>
      )}
      <OffersOut roleId={role.id} />
    </div>
  );
}
