import type { Metadata } from "next";
import { NewProjectForm } from "@/features/projects/new-project-form";

export const metadata: Metadata = { title: "New project · TeamMatch" };

export default function NewProjectPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">New project</h1>
        <p className="text-muted">
          Describe your idea. It starts as a draft, and you can add roles and
          publish it next.
        </p>
      </header>
      <NewProjectForm />
    </main>
  );
}
