"use client";

import Link from "next/link";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { useOpenProjects } from "./queries";

const noticeClass =
  "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100";

export function ProjectsList() {
  const projects = useOpenProjects();

  if (projects.isPending) {
    return (
      <p role="status" className="text-sm text-zinc-500">
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
      <p className="text-zinc-600 dark:text-zinc-400">
        No open projects yet.{" "}
        <Link
          href="/projects/new"
          className="font-medium text-indigo-600 hover:underline"
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
            className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">
              <Link
                href={`/projects/${project.id}`}
                className="hover:underline"
              >
                {project.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              by {project.owner_name || "an unnamed owner"} ·{" "}
              {project.open_role_count} open{" "}
              {project.open_role_count === 1 ? "role" : "roles"}
            </p>
            <p className="mt-3 text-zinc-700 dark:text-zinc-300">
              {project.pitch_preview}
            </p>
          </li>
        ))}
      </ul>
      {projects.hasNextPage && (
        <button
          type="button"
          disabled={projects.isFetchingNextPage}
          className="self-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
