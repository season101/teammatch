import type { Metadata } from "next";
import Link from "next/link";
import { SignedInProjects } from "@/features/projects/projects-list";

export const metadata: Metadata = { title: "Projects · TeamMatch" };

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Open projects this term, newest first.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New project
        </Link>
      </header>
      <SignedInProjects />
    </main>
  );
}
