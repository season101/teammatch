"use client";

import { useState, type FormEvent } from "react";
import { useUpdateProject } from "./queries";
import { buttonClasses } from "@/components/ui/button";
import {
  errorClass,
  inputClass,
  noticeClass,
} from "@/components/ui/form-classes";
import { PendingLabel } from "@/components/ui/pending-label";
import { RepoDetailsFields, type RepoDetails } from "./repo-details-fields";

const TITLE_MAX = 100;
const PITCH_MAX = 2000;

export function ProjectDetailsForm({
  projectId,
  initial,
  onDone,
  onCancel,
}: {
  projectId: number;
  initial: { title: string; pitch: string } & RepoDetails;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [pitch, setPitch] = useState(initial.pitch);
  const [extra, setExtra] = useState<RepoDetails>({
    repo_url: initial.repo_url,
    details: initial.details,
  });
  const [clientErrors, setClientErrors] = useState<{
    title?: string;
    pitch?: string;
  }>({});
  // Fields edited since the last save lose that save's error.
  const [edited, setEdited] = useState<Partial<Record<keyof RepoDetails, undefined>>>({});
  const update = useUpdateProject(projectId);

  const fields = update.error?.fields ?? {};
  const titleError = clientErrors.title ?? fields.title;
  const pitchError = clientErrors.pitch ?? fields.pitch;
  const otherFailure =
    update.isError && Object.keys(fields).length === 0
      ? update.error.message || "Could not save the changes. Please try again."
      : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: { title?: string; pitch?: string } = {};
    if (!title.trim()) found.title = "Title is required.";
    if (!pitch.trim()) found.pitch = "Pitch is required.";
    setClientErrors(found);
    if (found.title || found.pitch) return;
    setEdited({});
    update.mutate(
      {
        title: title.trim(),
        pitch: pitch.trim(),
        repo_url: extra.repo_url.trim(),
        details: extra.details.trim(),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Edit project</h1>
      {otherFailure && (
        <p role="alert" className={noticeClass}>
          {otherFailure}
        </p>
      )}
      <div>
        <label htmlFor="edit-title" className="font-medium">
          Title
        </label>
        <input
          id="edit-title"
          value={title}
          maxLength={TITLE_MAX}
          disabled={update.isPending}
          aria-invalid={Boolean(titleError)}
          className={inputClass}
          onChange={(event) => {
            setTitle(event.target.value);
            setClientErrors((prev) => ({ ...prev, title: undefined }));
          }}
        />
        {titleError && (
          <p role="alert" className={errorClass}>
            {titleError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="edit-pitch" className="font-medium">
          Pitch
        </label>
        <textarea
          id="edit-pitch"
          rows={6}
          value={pitch}
          maxLength={PITCH_MAX}
          disabled={update.isPending}
          aria-invalid={Boolean(pitchError)}
          className={inputClass}
          onChange={(event) => {
            setPitch(event.target.value);
            setClientErrors((prev) => ({ ...prev, pitch: undefined }));
          }}
        />
        {pitchError && (
          <p role="alert" className={errorClass}>
            {pitchError}
          </p>
        )}
      </div>
      <RepoDetailsFields
        idPrefix="edit"
        value={extra}
        errors={{ ...fields, ...edited }}
        disabled={update.isPending}
        onChange={(field, value) => {
          setExtra((prev) => ({ ...prev, [field]: value }));
          setEdited((prev) => ({ ...prev, [field]: undefined }));
        }}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={update.isPending}
          className={buttonClasses("cta", "sm")}
        >
          <PendingLabel pending={update.isPending} label="Saving">Save changes</PendingLabel>
        </button>
        <button
          type="button"
          className={buttonClasses("secondary", "sm")}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
