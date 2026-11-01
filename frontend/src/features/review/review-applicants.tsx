"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import { useMyProjects } from "./queries";
import { RoleQueue, RoleTabLabel, type FilledNotice } from "./role-queue";

export function ReviewApplicants() {
  const projects = useMyProjects();
  const [notice, setNotice] = useState<FilledNotice | null>(null);

  // The toast stays four seconds (docs/design/components/toast.md).
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (projects.isPending) {
    return <p className="text-muted">Loading your projects…</p>;
  }
  if (projects.isError) {
    return (
      <p role="alert" className="text-pass">
        Couldn&apos;t load your projects. Refresh the page to try again.
      </p>
    );
  }
  if (projects.data.length === 0) {
    return (
      <p className="text-muted">
        You don&apos;t own any projects yet.{" "}
        <Link
          href="/projects/new"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
        .
      </p>
    );
  }

  // Drafts have no applicants and archived projects are done, so only open projects show.
  const open = projects.data.filter((project) => project.status === "open");
  if (open.length === 0) {
    return (
      <p className="text-muted">
        No open project to review yet. Publish a draft from{" "}
        <Link
          href="/projects"
          className="font-medium text-primary hover:underline"
        >
          Projects
        </Link>{" "}
        to start getting applicants.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {open.map((project) => (
          <section
            key={project.id}
            aria-labelledby={`project-${project.id}`}
            className="flex flex-col gap-4"
          >
            <h2 id={`project-${project.id}`} className="text-lg font-semibold">
              {project.title}
            </h2>
            {project.roles.length === 0 ? (
              <p className="text-sm text-muted">No roles yet.</p>
            ) : (
              <Tabs
                label={`Roles of ${project.title}`}
                tabs={project.roles.map((role) => ({
                  id: String(role.id),
                  label: <RoleTabLabel role={role} />,
                  panel: (
                    <RoleQueue
                      role={role}
                      projectId={project.id}
                      rolesToGo={
                        project.roles.filter(
                          (other) =>
                            other.status === "open" && other.id !== role.id,
                        ).length
                      }
                      onFilled={setNotice}
                    />
                  ),
                }))}
              />
            )}
          </section>
        ))}
      </div>
      {notice && (
        <div className="fixed inset-x-4 top-4 z-20 flex justify-center sm:justify-end">
          <Toast title={notice.title} onDismiss={() => setNotice(null)}>
            {notice.detail}
          </Toast>
        </div>
      )}
    </>
  );
}
