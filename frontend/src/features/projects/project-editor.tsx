"use client";

import Link from "next/link";
import { useState } from "react";
import { useSkills } from "@/features/profiles/queries";
import {
  useAddRole,
  useDeleteRole,
  useProject,
  usePublishProject,
  useUpdateRole,
} from "./queries";
import { RoleForm } from "./role-form";
import { Modal } from "@/components/ui/modal";

const noticeClass =
  "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100";
const buttonClass =
  "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function ProjectEditor({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}) {
  const project = useProject(projectId);
  const skills = useSkills();
  const addRole = useAddRole(projectId);
  const updateRole = useUpdateRole(projectId);
  const publish = usePublishProject(projectId);
  const deleteRole = useDeleteRole(projectId);
  const [deleting, setDeleting] = useState<number | null>(null);
  // Which form is open: a new role, the role with this id, or none.
  const [editing, setEditing] = useState<"new" | number | null>(null);

  if (project.isPending || skills.isPending) {
    return (
      <p role="status" className="text-sm text-zinc-500">
        Loading project…
      </p>
    );
  }
  if (project.isError || skills.isError) {
    const notFound = project.error?.status === 404;
    return (
      <p role="alert" className={noticeClass}>
        {notFound
          ? "We couldn't find that project."
          : "Could not load the project. Refresh the page to try again."}
      </p>
    );
  }

  const data = project.data;
  const isOwner = data.owner === userId;
  const canEdit =
    isOwner && (data.status === "draft" || data.status === "open");
  const skillName = (id: number) =>
    skills.data.find((skill) => skill.id === id)?.name ?? "Unknown skill";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/projects"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← All projects
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {data.status} · by {data.owner_name || "an unnamed owner"}
        </p>
        <p className="text-zinc-700 dark:text-zinc-300">{data.pitch}</p>
      </header>

      <section aria-labelledby="roles-heading" className="flex flex-col gap-4">
        <h2 id="roles-heading" className="text-xl font-semibold">
          Roles
        </h2>

        {data.roles.length === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">
            No roles yet.
            {isOwner ? " Add your first role, then publish the project." : ""}
          </p>
        )}

        <ul className="flex flex-col gap-4">
          {data.roles.map((role) => (
            <li key={role.id}>
              {editing === role.id ? (
                <RoleForm
                  skills={skills.data}
                  initial={{
                    title: role.title,
                    description: role.description,
                    required_skills: role.required_skills,
                  }}
                  submitLabel="Save role"
                  pending={updateRole.isPending}
                  failure={updateRole.error}
                  onCancel={() => setEditing(null)}
                  onSubmit={(input) =>
                    updateRole.mutate(
                      { roleId: role.id, input },
                      { onSuccess: () => setEditing(null) },
                    )
                  }
                />
              ) : (
                <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold">
                    {role.title}
                    <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      {role.status}
                    </span>
                  </h3>
                  {role.description && (
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                      {role.description}
                    </p>
                  )}
                  <ul
                    aria-label={`Skills for ${role.title}`}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {role.required_skills.map((id) => (
                      <li
                        key={id}
                        className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100"
                      >
                        {skillName(id)}
                      </li>
                    ))}
                  </ul>
                  {canEdit && role.status === "open" && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => {
                          updateRole.reset();
                          setEditing(role.id);
                        }}
                      >
                        Edit role
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => {
                          deleteRole.reset();
                          setDeleting(role.id);
                        }}
                      >
                        Delete role
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {canEdit &&
          (editing === "new" ? (
            <RoleForm
              skills={skills.data}
              submitLabel="Add role"
              pending={addRole.isPending}
              failure={addRole.error}
              onCancel={() => setEditing(null)}
              onSubmit={(input) =>
                addRole.mutate(input, { onSuccess: () => setEditing(null) })
              }
            />
          ) : (
            <button
              type="button"
              className={`self-start ${buttonClass}`}
              onClick={() => {
                addRole.reset();
                setEditing("new");
              }}
            >
              Add a role
            </button>
          ))}
      </section>

      {deleteRole.isError && (
        <p role="alert" className={noticeClass}>
          {deleteRole.error.message || "Could not delete the role."}
        </p>
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this role?"
        ctaLabel="Keep role"
        onCta={() => setDeleting(null)}
        escapeLabel="Delete role"
        onEscape={() => {
          if (deleting !== null)
            deleteRole.mutate(deleting, { onSettled: () => setDeleting(null) });
        }}
      >
        Applicants waiting on it won&apos;t be considered. If it was the last
        open role, your team locks.
      </Modal>

      {isOwner && data.status === "draft" && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            disabled={publish.isPending}
            className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Publishing…" : "Publish project"}
          </button>
          {publish.isError && (
            <p role="alert" className={noticeClass}>
              {publish.error.message || "Could not publish. Please try again."}
            </p>
          )}
        </section>
      )}

      {publish.isSuccess && data.status === "open" && (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950"
        >
          Published. Your project is now open for applications.
        </p>
      )}
    </div>
  );
}
