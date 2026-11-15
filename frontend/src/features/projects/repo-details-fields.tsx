"use client";

import { GitHubIcon } from "@/components/ui/link-card";
import { errorClass, helperClass, inputClass } from "@/components/ui/form-classes";

const DETAILS_MAX = 2000;

export type RepoDetails = { repo_url: string; details: string };

// The two optional fields after the pitch on the new and edit project forms (F2-12).
// The server checks the link is https://github.com/... and its error shows on the field.
export function RepoDetailsFields({
  idPrefix,
  value,
  errors,
  disabled,
  onChange,
}: {
  idPrefix: string;
  value: RepoDetails;
  errors: Partial<RepoDetails>;
  disabled: boolean;
  onChange: (field: keyof RepoDetails, value: string) => void;
}) {
  const repoId = `${idPrefix}-repo`;
  const detailsId = `${idPrefix}-details`;

  return (
    <>
      <div>
        <label htmlFor={repoId} className="flex items-center gap-1.5 font-medium">
          <GitHubIcon className="size-4" />
          GitHub repository (optional)
        </label>
        <input
          id={repoId}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://github.com/you/project"
          value={value.repo_url}
          disabled={disabled}
          aria-invalid={Boolean(errors.repo_url)}
          aria-describedby={`${repoId}-hint${errors.repo_url ? ` ${repoId}-error` : ""}`}
          className={inputClass}
          onChange={(event) => onChange("repo_url", event.target.value)}
        />
        <p id={`${repoId}-hint`} className={helperClass}>
          For software projects. Must be a github.com link.
        </p>
        {errors.repo_url && (
          <p id={`${repoId}-error`} role="alert" className={errorClass}>
            {errors.repo_url}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={detailsId} className="font-medium">
          More details (optional)
        </label>
        <textarea
          id={detailsId}
          rows={4}
          value={value.details}
          maxLength={DETAILS_MAX}
          disabled={disabled}
          aria-invalid={Boolean(errors.details)}
          aria-describedby={errors.details ? `${detailsId}-error` : undefined}
          className={inputClass}
          onChange={(event) => onChange("details", event.target.value)}
        />
        <p className={helperClass}>
          {value.details.length}/{DETAILS_MAX} characters
        </p>
        {errors.details && (
          <p id={`${detailsId}-error`} role="alert" className={errorClass}>
            {errors.details}
          </p>
        )}
      </div>
    </>
  );
}
