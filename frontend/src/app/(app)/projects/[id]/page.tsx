"use client";

import { useParams, useSearchParams } from "next/navigation";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ProjectEditor } from "@/features/projects/project-editor";
import { RoleDetails } from "@/features/projects/role-details";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  // ?role=<id>: a deck card opened this role, so the page is its details (F3-13).
  const role = useSearchParams().get("role");
  const roleId = Number(role);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <title>Project · TeamMatch</title>
      <RequireSignIn>
        {(user) =>
          !Number.isInteger(projectId) ? (
            <p role="alert">That project address isn&apos;t valid.</p>
          ) : role && Number.isInteger(roleId) ? (
            <RoleDetails projectId={projectId} roleId={roleId} userId={user.id} />
          ) : (
            <ProjectEditor projectId={projectId} userId={user.id} />
          )
        }
      </RequireSignIn>
    </main>
  );
}
