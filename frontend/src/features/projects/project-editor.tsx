"use client";

import Link from "next/link";
import { useState } from "react";
import { useMyRole, useSkills } from "@/features/profiles/queries";
import {
  useAddRole,
  useCloseProject,
  useDeleteRole,
  useProject,
  usePublishProject,
  useUpdateRole,
  type ProjectDetail,
} from "./queries";
import { ApplyToRole } from "./apply-to-role";
import { RoleForm } from "./role-form";
import { Modal } from "@/components/ui/modal";
import { ProjectDetailsForm } from "./project-details-form";
import { Chip } from "@/components/ui/chip";
import { GitHubIcon, LinkCard } from "@/components/ui/link-card";
import { TeamStrip, type Segment } from "@/components/ui/team-strip";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { noticeClass, successClass } from "@/components/ui/form-classes";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PendingLabel } from "@/components/ui/pending-label";

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
  const role = useMyRole();
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
    return <SkeletonRows label="Loading project" />;
  }
  if (project.isError || skills.isError) {
    const notFound = project.error?.status === 404;
    return (
      <EmptyState
        heading="h1"
        title={notFound ? "We couldn't find that project" : "Couldn't load this project"}
        action={
          notFound ? (
            <Link href="/projects" className={buttonClasses()}>
              Back to projects
            </Link>
          ) : (
            <Button onClick={() => { project.refetch(); skills.refetch(); }}>Try again</Button>
          )
        }
      >
        {notFound
          ? "It may have been closed, or the link may be old."
          : "Check your connection and try again."}
      </EmptyState>
    );
  }

  const data = project.data;
  const isOwner = data.owner === userId;
  // Moderators and admins don't apply; the API refuses them too.
  const staff = role === "moderator" || role === "admin";
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
            initial={{
              title: data.title,
              pitch: data.pitch,
              repo_url: data.repo_url ?? "",
              details: data.details ?? "",
            }}
            onDone={() => setEditingDetails(false)}
            onCancel={() => setEditingDetails(false)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-6 rounded-card bg-linear-to-br from-cover-indigo to-[color-mix(in_oklab,var(--color-cover-indigo)_62%,black)] p-6 text-white">
              {segments.length > 0 && <TeamStrip segments={segments} />}
              <h1 className="font-display text-3xl font-extrabold">
                {data.title}
              </h1>
            </div>
            {/* Status as a chip, and how full the team is in words (principle 2). */}
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Chip variant={data.status === "open" ? "selected" : "default"}>
                {(data.status ?? "").replace(/^./, (first) => first.toUpperCase())}
              </Chip>
              {data.roles.length > 0 && (
                <span>
                  {data.roles.filter((role) => role.status === "filled").length} of{" "}
                  {data.roles.length} roles filled ·
                </span>
              )}
              <span>by {data.owner_name || "an unnamed owner"}</span>
            </p>
            {data.moderators.length > 0 && (
              <p className="text-sm text-muted">
                Moderated by {data.moderators.map((name) => name || "a moderator").join(", ")}
              </p>
            )}
            <p className="text-text">{data.pitch}</p>
            <RepoAndDetails project={data} />
            {canEdit && (
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setEditingDetails(true)}
                >
                  Edit details
                </button>
                {/* Destructive, so red text and set apart from Edit (README rule 3). */}
                <button
                  type="button"
                  className={`${buttonClasses("danger", "sm")} ml-auto`}
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
                  {!isOwner && !staff && (
                    <ApplyToRole
                      roleId={role.id}
                      roleTitle={role.title}
                      canApply={
                        data.status === "open" && role.status === "open"
                      }
                    />
                  )}
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
                        className={`${buttonClasses("danger", "sm")} ml-auto`}
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
        // Names the role, so the right one is being deleted.
        title={`Delete ${data.roles.find((role) => role.id === deleting)?.title ?? "this role"}?`}
        ctaLabel="Keep role"
        onCta={() => setDeleting(null)}
        escapeLabel="Delete role"
        busy={deleteRole.isPending}
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
        busy={closeProject.isPending}
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
            className={`${buttonClasses("cta")} self-start`}
            onClick={() => publish.mutate()}
          >
            <PendingLabel pending={publish.isPending} label="Publishing">Publish project</PendingLabel>
          </button>
          {publish.isError && (
            <p role="alert" className={noticeClass}>
              {publish.error.message || "Could not publish. Please try again."}
            </p>
          )}
        </section>
      )}

      {publish.isSuccess && data.status === "open" && (
        <p role="status" className={successClass}>
          Published. Your project is now open for applications.
        </p>
      )}
    </div>
  );
}

// View the code and More from the owner (F2-12), each hidden when empty. The role
// details page shows them too.
export function RepoAndDetails({
  project,
}: {
  project: Pick<ProjectDetail, "repo_url" | "details">;
}) {
  return (
    <>
      {project.repo_url && (
        <LinkCard href={project.repo_url} title="View the code" icon={<GitHubIcon />} />
      )}
      {project.details && (
        <section aria-labelledby="owner-details-heading" className="flex flex-col gap-1">
          <h2
            id="owner-details-heading"
            className="text-xs font-semibold tracking-wide text-muted uppercase"
          >
            More from the owner
          </h2>
          <p className="whitespace-pre-line text-text">{project.details}</p>
        </section>
      )}
    </>
  );
}
