import type { Metadata } from "next";
import { NewProjectLink } from "@/features/projects/new-project-link";
import { SignedInProjects } from "@/features/projects/projects-list";

export const metadata: Metadata = { title: "Projects · TeamMatch" };

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted">
            Find a project to join, or manage your own.
          </p>
        </div>
        <NewProjectLink />
      </header>
      <SignedInProjects />
    </main>
  );
}
