"use client";

import Link from "next/link";
import { useState } from "react";
import { useSkills } from "@/features/profiles/queries";
import {
  useAddRole,
  useCloseProject,
  useDeleteRole,
  useProject,
  usePublishProject,
  useUpdateRole,
} from "./queries";
import { RoleForm } from "./role-form";
import { Modal } from "@/components/ui/modal";
import { ProjectDetailsForm } from "./project-details-form";
import { Chip } from "@/components/ui/chip";
import { TeamStrip, type Segment } from "@/components/ui/team-strip";

const noticeClass =
  "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100";
const buttonClass =
  "rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2";

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
  const closeProject = useCloseProject(projectId);
  const [closing, setClosing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  if (project.isPending || skills.isPending) {
    return (
      <p role="status" className="text-sm text-muted">
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
  const locked = data.status === "locked";
  const segments: Segment[] = data.roles.map((role) =>
    role.status === "filled" ? "filled" : "open",
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/projects" className="text-sm text-primary hover:underline">
          ← All projects
        </Link>
        {locked && (
          <p
            role="status"
            className="rounded-lg border border-border p-3 text-sm font-medium"
          >
            This team is locked. Every role is filled.
          </p>
        )}
        {editingDetails ? (
          <ProjectDetailsForm
            projectId={projectId}
            initial={{ title: data.title, pitch: data.pitch }}
            onDone={() => setEditingDetails(false)}
            onCancel={() => setEditingDetails(false)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-6 rounded-card bg-linear-to-br from-cover-indigo to-[color-mix(in_oklab,var(--color-cover-indigo)_62%,black)] p-6 text-white">
              {segments.length > 0 && <TeamStrip segments={segments} />}
              <h1 className="text-3xl font-bold tracking-tight">
                {data.title}
              </h1>
            </div>
            <p className="text-sm text-muted">
              {data.status} · by {data.owner_name || "an unnamed owner"}
            </p>
            <p className="text-text">{data.pitch}</p>
            {canEdit && (
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setEditingDetails(true)}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    closeProject.reset();
                    setClosing(true);
                  }}
                >
                  Close project
                </button>
              </div>
            )}
          </>
        )}
        {closeProject.isError && (
          <p role="alert" className={noticeClass}>
            {closeProject.error.message || "Could not close the project."}
          </p>
        )}
      </header>

      <section aria-labelledby="roles-heading" className="flex flex-col gap-4">
        <h2 id="roles-heading" className="text-xl font-semibold">
          Roles
        </h2>

        {data.roles.length === 0 && (
          <p className="text-muted">
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
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <h3 className="text-lg font-semibold">
                    {role.title}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {role.status}
                      {role.filled_by_name ? ` · ${role.filled_by_name}` : ""}
                    </span>
                  </h3>
                  {role.description && (
                    <p className="mt-1 text-text">{role.description}</p>
                  )}
                  <ul
                    aria-label={`Skills for ${role.title}`}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {role.required_skills.map((id) => (
                      <li key={id}>
                        <Chip>{skillName(id)}</Chip>
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

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        title="Close this project?"
        ctaLabel="Keep project"
        onCta={() => setClosing(false)}
        escapeLabel="Close project"
        onEscape={() =>
          closeProject.mutate(undefined, { onSettled: () => setClosing(false) })
        }
      >
        It leaves the project list, and anyone with a pending application is
        withdrawn. You can then publish another project.
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
