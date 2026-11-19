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
import { termEnd } from "@/features/teams/my-team";
import { useMyTeam } from "@/features/teams/queries";
import { MyProjectsList } from "./my-projects-list";
import { useProjectsTab } from "./projects-tab";
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
  // Rows fade up in order only when the list arrives from a load. A list that was
  // already cached is just there, and search results never stagger.
  const [arrived] = useState(projects.isPending);
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
        {items.map((project, i) => (
          <li
            key={project.id}
            // The first six are 40ms apart; the rest come in with the sixth.
            style={arrived && !search ? { animationDelay: `${Math.min(i, 5) * 40}ms` } : undefined}
            className={`relative rounded-card border border-border bg-surface p-5 hover:bg-surface-2 ${arrived && !search ? "motion-safe:animate-row-in" : ""}`}
          >
            <h2 className="text-lg font-semibold">
              <Link
                href={`/projects/${project.id}`}
                // The whole card is the link's target, not just the 23px title.
                className="after:absolute after:inset-0 after:rounded-card"
              >
                {project.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted">
              by {project.owner_name || "an unnamed owner"} ·{" "}
              {project.open_role_count} open{" "}
              {project.open_role_count === 1 ? "role" : "roles"}
              {/* How close the team is to locking (principle 2). */}
              {project.role_count > 0 &&
                ` · ${project.role_count - project.open_role_count} of ${project.role_count} filled`}
            </p>
            <p className="mt-3 text-text">{project.pitch_preview}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search by project, role or skill"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${inputClass} pl-9`}
        />
      </div>
      {/* Says the search ran and what it found. "or more" while further pages wait. */}
      {search && !loading && items.length > 0 && (
        <p role="status" className="-my-1 text-sm text-muted">
          {items.length}
          {projects.hasNextPage ? " or more" : ""} {items.length === 1 ? "project matches" : "projects match"}
        </p>
      )}

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
// tabs, and the list here follows the one picked there. The two layouts switch by CSS at 1024 px.
function ProjectsView() {
  const mine = useMyProjects();
  const tab = useProjectsTab();
  // Benched (BR-09): the list still opens, so say why nothing here can be applied to.
  const team = useMyTeam().data;

  return (
    <>
      {team && (
        <p className="mb-4 rounded-row border border-border bg-surface-2 px-4 py-3 text-sm">
          You&apos;re on {team.project.title} until {termEnd(team)}, so you can&apos;t apply to
          another role this term.
        </p>
      )}
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
                  <MyProjectsList projects={mine.data ?? []} withOpenNote />
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="hidden lg:block">
        {tab === "mine" ? (
          <MyProjectsList projects={mine.data ?? []} withOpenNote />
        ) : (
          <ProjectsList />
        )}
      </div>
    </>
  );
}

// The page itself is a server component, so the sign-in wrapper lives here.
export function SignedInProjects() {
  return <RequireSignIn>{() => <ProjectsView />}</RequireSignIn>;
}
