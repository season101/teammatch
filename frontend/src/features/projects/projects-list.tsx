"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass, noticeClass } from "@/components/ui/form-classes";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { PendingLabel } from "@/components/ui/pending-label";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { useMyProjects } from "@/features/review/queries";
import { MyProjectsList } from "./my-projects-list";
import { useOpenProjects } from "./queries";

export function ProjectsList() {
  const [query, setQuery] = useState("");
  // What the API is asked for: the typed text, trimmed, once typing pauses.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const projects = useOpenProjects(search);
  const clear = () => {
    setQuery("");
    setSearch("");
  };

  const items = projects.data?.pages.flatMap((page) => page.results) ?? [];
  // Old results stay up while a search loads, unless there were none to keep.
  const loading =
    projects.isPending || (projects.isPlaceholderData && items.length === 0);

  let content;
  if (loading) {
    content = <SkeletonRows label="Loading projects" />;
  } else if (!projects.data) {
    content = (
      <EmptyState
        title="Couldn't load projects"
        action={<Button onClick={() => projects.refetch()}>Try again</Button>}
      >
        Check your connection and try again.
      </EmptyState>
    );
  } else if (items.length === 0 && search) {
    content = (
      <EmptyState
        title={<>Nothing matches &ldquo;{search}&rdquo;</>}
        action={<Button onClick={clear}>Clear search</Button>}
      >
        Try a skill or a project name.
      </EmptyState>
    );
  } else if (items.length === 0) {
    return (
      <EmptyState
        title="No open projects yet"
        action={
          <Link href="/projects/new" className={buttonClasses()}>
            Post a project
          </Link>
        }
      >
        Be the first to post one this term.
      </EmptyState>
    );
  } else {
    content = (
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        aria-label="Search projects"
        placeholder="Search by project, role or skill"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={inputClass}
      />

      {content}

      {projects.isFetchNextPageError && (
        <p role="alert" className={noticeClass}>
          Couldn&apos;t load more projects. Try again.
        </p>
      )}
      {projects.hasNextPage && (
        <button
          type="button"
          disabled={projects.isFetchingNextPage || projects.isPlaceholderData}
          className={`${buttonClasses("secondary", "sm")} self-center`}
          onClick={() => projects.fetchNextPage()}
        >
          <PendingLabel pending={projects.isFetchingNextPage} label="Loading">Load more</PendingLabel>
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
                  <MyProjectsList projects={owned} withOpenNote />
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
