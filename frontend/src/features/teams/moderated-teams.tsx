"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useModeratedProjects } from "./queries";

// A moderator's Teams page: the projects an admin put them on, and each one's team.
export function ModeratedTeams() {
  const projects = useModeratedProjects();

  if (projects.isPending) {
    return <SkeletonRows label="Loading your projects" />;
  }
  if (projects.isError) {
    return (
      <EmptyState
        title="Couldn't load your projects"
        action={<Button onClick={() => projects.refetch()}>Try again</Button>}
      >
        Check your connection and try again.
      </EmptyState>
    );
  }
  if (projects.data.length === 0) {
    return (
      <EmptyState title="No projects yet">
        Projects show up here once an admin puts you on them.
      </EmptyState>
    );
  }
  return (
    <ul aria-label="Projects you moderate" className="flex flex-col gap-4">
      {projects.data.map((project) => (
        <li
          key={project.id}
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">
              {project.status} · {project.term.name}
            </p>
            <h2 className="text-xl font-bold">{project.title}</h2>
          </div>
          {project.team ? (
            <ul aria-label={`Team for ${project.title}`} className="flex flex-col gap-1">
              {project.team.members.map((member, index) => (
                <li key={index} className="text-sm">
                  <span className="font-semibold">
                    {member.display_name || "Unnamed member"}
                  </span>
                  <span className="text-muted"> · {member.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              The team forms once every role is filled. Team chat opens then.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {project.team && (
              <Link
                href={`/teams/${project.team.id}/chat`}
                className={buttonClasses("cta", "sm")}
                aria-label={`Open team chat for ${project.title}`}
              >
                Open team chat
              </Link>
            )}
            <Link
              href={`/projects/${project.id}`}
              className={buttonClasses("secondary", "sm")}
              aria-label={`View ${project.title}`}
            >
              View project
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
