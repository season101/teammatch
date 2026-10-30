"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import {
  helperClass,
  inputClass,
  noticeClass,
} from "@/components/ui/form-classes";
import { Tabs } from "@/components/ui/tabs";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { useMyProjects } from "@/features/review/queries";
import { MyProjectsList } from "./my-projects-list";
import { useOpenProjects } from "./queries";

export function ProjectsList() {
  const projects = useOpenProjects();
  const [query, setQuery] = useState("");

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

  // The list API has no search yet, so this filters the pages already loaded.
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? items.filter((project) =>
        [project.title, project.owner_name, project.pitch_preview].some(
          (text) => text.toLowerCase().includes(needle),
        ),
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search projects"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={inputClass}
        />
        {needle && projects.hasNextPage && (
          <p className={helperClass}>
            Searching the projects loaded so far. Load more to search further.
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-xl font-semibold">
            No projects match &ldquo;{query.trim()}&rdquo;
          </p>
          <p className="text-muted">Try a project name or an owner.</p>
          <button
            type="button"
            className={buttonClasses("secondary", "sm")}
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((project) => (
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
      )}

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

// Phone and tablet get Browse | Mine tabs here. On desktop the sidebar has those
// tabs, so only the Browse list shows. The two layouts switch by CSS at 1024 px.
function ProjectsView() {
  const mine = useMyProjects();
  const owned =
    mine.data?.filter((project) => project.status !== "archived") ?? [];

  return (
    <>
      <div className="lg:hidden">
        <Tabs
          label="Projects"
          tabs={[
            {
              id: "browse",
              label: "Browse",
              panel: (
                <div className="pt-4">
                  <ProjectsList />
                </div>
              ),
            },
            {
              id: "mine",
              label: "Mine",
              panel: (
                <div className="pt-4">
                  <MyProjectsList projects={owned} />
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="hidden lg:block">
        <ProjectsList />
      </div>
    </>
  );
}

// The page itself is a server component, so the sign-in wrapper lives here.
export function SignedInProjects() {
  return <RequireSignIn>{() => <ProjectsView />}</RequireSignIn>;
}
