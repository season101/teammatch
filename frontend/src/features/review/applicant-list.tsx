"use client";

import { useApplicants, useDecide } from "./queries";

const buttonBase =
  "rounded-lg px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60";

export function ApplicantList({ roleId, roleTitle }: { roleId: number; roleTitle: string }) {
  const applicants = useApplicants(roleId);
  const decide = useDecide(roleId);
  const headingId = `role-${roleId}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="font-semibold">
        {roleTitle}
        {applicants.isSuccess && (
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            {applicants.data.length} pending
          </span>
        )}
      </h3>

      {decide.isSuccess && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {decide.variables.like ? "Liked" : "Passed on"} {decide.variables.name}.
        </p>
      )}
      {decide.isError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {decide.error.message}
        </p>
      )}

      {applicants.isPending ? (
        <p className="text-sm text-zinc-500">Loading applicants…</p>
      ) : applicants.isError ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          Couldn&apos;t load applicants. Refresh the page to try again.
        </p>
      ) : applicants.data.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No pending applicants.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {applicants.data.map((application) => {
            const name = application.applicant.display_name || "Unnamed applicant";
            return (
              <li
                key={application.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  {application.applicant.major && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {application.applicant.major}
                    </p>
                  )}
                </div>
                {application.applicant.skills.length > 0 && (
                  <ul aria-label={`${name}'s skills`} className="flex flex-wrap gap-2">
                    {application.applicant.skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="rounded-full border border-zinc-300 px-3 py-0.5 text-sm dark:border-zinc-700"
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                )}
                {application.note ? (
                  <blockquote className="border-l-2 border-zinc-300 pl-3 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                    {application.note}
                  </blockquote>
                ) : (
                  <p className="text-sm text-zinc-500">No note.</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Like ${name}`}
                    disabled={decide.isPending}
                    className={`${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`}
                    onClick={() => decide.mutate({ id: application.id, name, like: true })}
                  >
                    Like
                  </button>
                  <button
                    type="button"
                    aria-label={`Pass on ${name}`}
                    disabled={decide.isPending}
                    className={`${buttonBase} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}
                    onClick={() => decide.mutate({ id: application.id, name, like: false })}
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
