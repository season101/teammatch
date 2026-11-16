"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { SkeletonRows } from "@/components/ui/skeleton";
import { applicantsQuery, useMyProjects, type MyProject } from "./queries";
import { RoleQueue, RoleTabLabel } from "./role-queue";

export function ReviewApplicants() {
  const projects = useMyProjects();

  if (projects.isPending) {
    return <SkeletonRows label="Loading your projects" />;
  }
  if (projects.isError) {
    return (
      <p role="alert" className="text-pass">
        Couldn&apos;t load your projects. Refresh the page to try again.
      </p>
    );
  }
  if (projects.data.length === 0) {
    return (
      <p className="text-muted">
        You don&apos;t own any projects yet.{" "}
        {/* py-3.5: a 44px touch target; padding on an inline link doesn't move the line. */}
        <Link
          href="/projects/new"
          className="py-3.5 font-medium text-primary hover:underline"
        >
          Create one
        </Link>
        .
      </p>
    );
  }

  // Drafts have no applicants and archived projects are done, so only open projects show.
  const open = projects.data.filter((project) => project.status === "open");
  if (open.length === 0) {
    return (
      <p className="text-muted">
        No open project to review yet. Publish a draft from{" "}
        {/* py-3.5: a 44px touch target; padding on an inline link doesn't move the line. */}
        <Link
          href="/projects"
          className="py-3.5 font-medium text-primary hover:underline"
        >
          Projects
        </Link>{" "}
        to start getting applicants.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {open.map((project) => (
        <section
          key={project.id}
          aria-labelledby={`project-${project.id}`}
          className="flex flex-col gap-4"
        >
          <h2 id={`project-${project.id}`} className="text-lg font-semibold">
            {project.title}
          </h2>
          {project.roles.length === 0 ? (
            <p className="text-sm text-muted">No roles yet.</p>
          ) : (
            <RoleTabs project={project} />
          )}
        </section>
      ))}
    </div>
  );
}

// Opens on the first role with someone waiting, not on a filled one, else the first
// role; a role picked earlier this session wins. The tab labels load the same lists
// for their counts, so no extra requests.
function RoleTabs({ project }: { project: MyProject }) {
  const open = project.roles.filter((role) => role.status === "open");
  const waiting = useQueries({
    queries: open.map((role) => applicantsQuery(role.id)),
  });
  // Picked once, after the lists are fetched for this visit: an older cached list can
  // be missing someone, and the tab mustn't jump when the last person on it is decided.
  const [picked, setPicked] = useState<number>();
  let first = picked;
  if (first === undefined) {
    if (waiting.some((list) => list.isFetching || list.isPending)) {
      return <SkeletonRows label="Loading applicants" />;
    }
    first = (open.find((_, i) => waiting[i].data?.length) ?? project.roles[0]).id;
    setPicked(first);
  }

  return (
    <Tabs
      label={`Roles of ${project.title}`}
      defaultTab={String(first)}
      // Back from an applicant's resume (F1-17) returns to the same role.
      remember={`review-${project.id}`}
      tabs={project.roles.map((role) => ({
        id: String(role.id),
        label: <RoleTabLabel role={role} />,
        panel: (
          <RoleQueue
            role={role}
            projectId={project.id}
            rolesToGo={
              open.filter((other) => other.id !== role.id).length
            }
          />
        ),
      }))}
    />
  );
}
