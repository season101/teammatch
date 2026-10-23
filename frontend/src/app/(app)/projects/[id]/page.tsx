"use client";

import { useParams } from "next/navigation";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ProjectEditor } from "@/features/projects/project-editor";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <RequireSignIn>
        {(user) =>
          Number.isInteger(projectId) ? (
            <ProjectEditor projectId={projectId} userId={user.id} />
          ) : (
            <p role="alert">That project address isn&apos;t valid.</p>
          )
        }
      </RequireSignIn>
    </main>
  );
}
