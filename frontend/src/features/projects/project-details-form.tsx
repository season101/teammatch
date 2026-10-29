"use client";

import { useState, type FormEvent } from "react";
import { useUpdateProject } from "./queries";
import { buttonClasses } from "@/components/ui/button";
import {
  errorClass,
  inputClass,
  noticeClass,
} from "@/components/ui/form-classes";

const TITLE_MAX = 100;
const PITCH_MAX = 2000;

export function ProjectDetailsForm({
  projectId,
  initial,
  onDone,
  onCancel,
}: {
  projectId: number;
  initial: { title: string; pitch: string };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [pitch, setPitch] = useState(initial.pitch);
  const [clientErrors, setClientErrors] = useState<{
    title?: string;
    pitch?: string;
  }>({});
  const update = useUpdateProject(projectId);

  const fields = update.error?.fields ?? {};
  const titleError = clientErrors.title ?? fields.title;
  const pitchError = clientErrors.pitch ?? fields.pitch;
  const otherFailure =
    update.isError && !fields.title && !fields.pitch
      ? update.error.message || "Could not save the changes. Please try again."
      : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: { title?: string; pitch?: string } = {};
    if (!title.trim()) found.title = "Title is required.";
    if (!pitch.trim()) found.pitch = "Pitch is required.";
    setClientErrors(found);
    if (found.title || found.pitch) return;
    update.mutate(
      { title: title.trim(), pitch: pitch.trim() },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={update.isPending}
          className={buttonClasses("cta", "sm")}
        >
          {update.isPending ? "Saving…" : "Save changes"}
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
