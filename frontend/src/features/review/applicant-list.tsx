"use client";

import { useApplicants, useDecide } from "./queries";
import { buttonClasses } from "@/components/ui/button";

export function ApplicantList({
  roleId,
  roleTitle,
}: {
  roleId: number;
  roleTitle: string;
}) {
  const applicants = useApplicants(roleId);
  const decide = useDecide(roleId);
  const headingId = `role-${roleId}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="font-semibold">
        {roleTitle}
        {applicants.isSuccess && (
          <span className="ml-2 text-sm font-normal text-muted">
            {applicants.data.length} pending
          </span>
        )}
      </h3>

      {decide.isSuccess && (
        <p role="status" className="text-sm text-success">
          {decide.variables.like ? "Liked" : "Passed on"}{" "}
          {decide.variables.name}.
        </p>
      )}
      {decide.isError && (
        <p role="alert" className="text-sm text-pass">
          {decide.error.message}
        </p>
      )}

      {applicants.isPending ? (
        <p className="text-sm text-muted">Loading applicants…</p>
      ) : applicants.isError ? (
        <p role="alert" className="text-sm text-pass">
          Couldn&apos;t load applicants. Refresh the page to try again.
        </p>
      ) : applicants.data.length === 0 ? (
        <p className="text-sm text-muted">No pending applicants.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {applicants.data.map((application) => {
            const name =
              application.applicant.display_name || "Unnamed applicant";
            return (
              <li
                key={application.id}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  {application.applicant.major && (
                    <p className="text-sm text-muted">
                      {application.applicant.major}
                    </p>
                  )}
                </div>
                {application.applicant.skills.length > 0 && (
                  <ul
                    aria-label={`${name}'s skills`}
                    className="flex flex-wrap gap-2"
                  >
                    {application.applicant.skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="	rounded-pill border border-border px-3 py-0.5 text-sm text-text"
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                )}
                {application.note ? (
                  <blockquote className="border-l-2 border-border pl-3 text-text">
                    {application.note}
                  </blockquote>
                ) : (
                  <p className="text-sm text-muted">No note.</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Like ${name}`}
                    disabled={decide.isPending}
                    className={buttonClasses("cta", "sm")}
                    onClick={() =>
                      decide.mutate({ id: application.id, name, like: true })
                    }
                  >
                    Like
                  </button>
                  <button
                    type="button"
                    aria-label={`Pass on ${name}`}
                    disabled={decide.isPending}
                    className={buttonClasses("secondary", "sm")}
                    onClick={() =>
                      decide.mutate({ id: application.id, name, like: false })
                    }
                  >
                    Pass
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
