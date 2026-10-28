"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { noticeClass } from "@/components/ui/form-classes";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { useOpenProjects } from "./queries";

export function ProjectsList() {
  const projects = useOpenProjects();

  if (projects.isPending) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading projects…
      </p>
    );
  }
  if (projects.isError) {
    return (
      <p role="alert" className={noticeClass}>
        Could not load projects. Please try again.
      </p>
    );
  }

  const items = projects.data.pages.flatMap((page) => page.results);
  if (items.length === 0) {
    return (
      <p className="text-muted">
        No open projects yet.{" "}
        <Link
          href="/projects/new"
          className="font-medium text-primary hover:underline"
        >
          Create the first one
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {items.map((project) => (
          <li
            key={project.id}
            className="rounded-card border border-border bg-surface p-5"
          >
            <h2 className="text-lg font-semibold">
              <Link
                href={`/projects/${project.id}`}
                className="hover:underline"
              >
                {project.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted">
              by {project.owner_name || "an unnamed owner"} ·{" "}
              {project.open_role_count} open{" "}
              {project.open_role_count === 1 ? "role" : "roles"}
            </p>
            <p className="mt-3 text-text">{project.pitch_preview}</p>
          </li>
        ))}
      </ul>
      {projects.hasNextPage && (
        <button
          type="button"
          disabled={projects.isFetchingNextPage}
          className={`${buttonClasses("secondary", "sm")} self-center`}
          onClick={() => projects.fetchNextPage()}
        >
          {projects.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

// The page itself is a server component, so the sign-in wrapper lives here.
export function SignedInProjects() {
  return <RequireSignIn>{() => <ProjectsList />}</RequireSignIn>;
}
