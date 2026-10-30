"use client";

import Link from "next/link";
import type { MyProject } from "@/features/review/queries";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  locked: "Locked",
  archived: "Archived",
};

// Groups follow the design: what needs you first, then drafts, then done.
const GROUPS = [
  { status: "open", heading: "Open" },
  { status: "draft", heading: "Drafts" },
  { status: "locked", heading: "Locked" },
  { status: "archived", heading: "Archived" },
];

// One short line under the title: roles filled, or why it is still a draft.
export function projectSummary(project: MyProject): string {
  const total = project.roles.length;
  const filled = project.roles.filter(
    (role) => role.status === "filled",
  ).length;
  const roles = `${total} ${total === 1 ? "role" : "roles"}`;
  if (project.status === "draft") return `${roles} · not published`;
  if (project.status === "locked") return `${roles} · team formed`;
  return `${filled} of ${roles} filled`;
}

const rowClass =
  "flex min-h-11 flex-col gap-0.5 rounded-row border border-border bg-surface px-3 py-2 hover:bg-surface-2";

export function MyProjectsList({ projects }: { projects: MyProject[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-3 py-4">
        <p className="font-semibold">No projects yet</p>
        <p className="text-sm text-muted">
          Post an idea and the roles it needs. You can keep it as a draft until
          it&apos;s ready.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(({ status, heading }) => {
        const items = projects.filter((project) => project.status === status);
        if (items.length === 0) return null;
        return (
          <section
            key={status}
            aria-label={heading}
            className="flex flex-col gap-2"
          >
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {heading}
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className={rowClass}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{project.title}</span>
                      <span className="rounded-pill border border-border px-2 text-xs text-muted">
                        {STATUS_LABEL[status]}
                      </span>
                    </span>
                    <span className="text-sm text-muted">
                      {projectSummary(project)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
