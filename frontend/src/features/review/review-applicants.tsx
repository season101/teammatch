"use client";

import Link from "next/link";
import { ApplicantList } from "./applicant-list";
import { useMyProjects } from "./queries";

export function ReviewApplicants() {
  const projects = useMyProjects();

  if (projects.isPending) {
    return <p className="text-zinc-500">Loading your projects…</p>;
  }
  if (projects.isError) {
    return (
      <p role="alert" className="text-rose-600 dark:text-rose-400">
        Couldn&apos;t load your projects. Refresh the page to try again.
      </p>
    );
  }
  if (projects.data.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        You don&apos;t own any projects yet.{" "}
        <Link href="/projects/new" className="font-medium text-indigo-600 hover:underline">
          Create one
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      {projects.data.map((project) => (
        <section
          key={project.id}
          aria-labelledby={`project-${project.id}`}
          className="flex flex-col gap-4"
        >
          <h2 id={`project-${project.id}`} className="text-lg font-semibold">
            {project.title}
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              {project.status}
            </span>
          </h2>
          {project.status === "draft" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Publish this project to get applicants.
            </p>
          ) : project.roles.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No roles yet.</p>
          ) : (
            project.roles.map((role) => (
              <ApplicantList key={role.id} roleId={role.id} roleTitle={role.title} />
            ))
          )}
        </section>
      ))}
    </div>
  );
}
