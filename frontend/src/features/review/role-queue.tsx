"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ApplicantCard } from "./applicant-card";
import { useApplicants, useDecide, type MyProject } from "./queries";

type Role = MyProject["roles"][number];

export type FilledNotice = { title: string; detail: string };

type QueueProps = {
  role: Role;
  projectId: number;
  // Open roles in the project besides this one, for "2 roles to go".
  rolesToGo: number;
  onFilled: (notice: FilledNotice) => void;
};

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

// One role's queue: the first waiting applicant as a card, with Pass and Like.
export function RoleQueue(props: QueueProps) {
  return props.role.status === "filled" ? (
    <p className="py-6 text-center text-muted">{props.role.title} is filled.</p>
  ) : (
    <OpenRoleQueue {...props} />
  );
}

function OpenRoleQueue({ role, projectId, rolesToGo, onFilled }: QueueProps) {
  const applicants = useApplicants(role.id);
  const decide = useDecide(role.id);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = applicants.data?.[0];
  const name = current?.applicant.display_name || "Unnamed applicant";

  function decideOn(like: boolean) {
    if (!current || decide.isPending) return;
    decide.mutate(
      { id: current.id, name, like },
      {
        onSuccess: (decided) => {
          if (!like) return;
          onFilled({
            title: `${role.title} filled`,
            detail: decided.team_locked
              ? "That was the last role. Your team is locked."
              : `${rolesToGo} ${rolesToGo === 1 ? "role" : "roles"} to go.`,
          });
        },
      },
    );
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
    return <p className="pt-4 text-sm text-muted">Loading applicants…</p>;
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
      {decide.isSuccess && !decide.variables.like && (
        <p role="status" className="text-sm text-success">
          Passed on {decide.variables.name}.
        </p>
      )}
      {decide.isError && (
        <p role="alert" className="text-sm text-pass">
          {decide.error.message}
        </p>
      )}

      {current ? (
        <>
          <p className="text-sm text-muted">
            {role.title} · 1 of {applicants.data.length} waiting
          </p>
          <ApplicantCard
            key={current.id}
            application={current}
            roleTitle={role.title}
            disabled={decide.isPending}
            onLike={() => decideOn(true)}
            onPass={() => decideOn(false)}
          />
        </>
      ) : (
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
    </div>
  );
}
