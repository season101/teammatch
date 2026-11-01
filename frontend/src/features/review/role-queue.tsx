"use client";

import { ApplicantCard } from "./applicant-card";
import { useApplicants, useDecide, type MyProject } from "./queries";

type Role = MyProject["roles"][number];

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
export function RoleQueue({ role }: { role: Role }) {
  return role.status === "filled" ? (
    <p className="py-6 text-center text-muted">{role.title} is filled.</p>
  ) : (
    <OpenRoleQueue role={role} />
  );
}

function OpenRoleQueue({ role }: { role: Role }) {
  const applicants = useApplicants(role.id);
  const decide = useDecide(role.id);

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

  const [current] = applicants.data;
  const name = current?.applicant.display_name || "Unnamed applicant";

  return (
    <div className="flex flex-col gap-4 pt-4">
      {decide.isSuccess && (
        <p role="status" className="text-sm text-success">
          {decide.variables.like ? "Liked" : "Passed on"}{" "}
          {decide.variables.name}.
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
            onLike={() => decide.mutate({ id: current.id, name, like: true })}
            onPass={() => decide.mutate({ id: current.id, name, like: false })}
          />
        </>
      ) : (
        <p className="py-6 text-center text-muted">
          No one&apos;s waiting for {role.title}.
        </p>
      )}
    </div>
  );
}
