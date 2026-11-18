import type { Metadata } from "next";
import { SignedInNewProjectForm } from "@/features/projects/new-project-form";

export const metadata: Metadata = { title: "New project · TeamMatch" };

export default function NewProjectPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">New project</h1>
        <p className="text-muted">
          Describe your idea. It starts as a draft, and you can add roles and
          publish it next.
        </p>
      </header>
      <SignedInNewProjectForm />
    </main>
  );
}
