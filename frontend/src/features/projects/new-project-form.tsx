"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import {
  errorClass,
  helperClass,
  inputClass,
  noticeClass,
} from "@/components/ui/form-classes";
import { useCreateProject, type FieldErrors } from "./queries";

const TITLE_MAX = 100;
const PITCH_MAX = 2000;

export function NewProjectForm() {
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const create = useCreateProject();

  const failure = create.error;
  const noTerm = failure?.status === 409;
  const signedOut = failure?.status === 401 || failure?.status === 403;
  const errors: FieldErrors = { ...failure?.fields, ...clientErrors };
  const unexpected =
    failure &&
    !noTerm &&
    !signedOut &&
    Object.keys(failure.fields).length === 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: FieldErrors = {};
    if (!title.trim()) found.title = "Title is required.";
    if (!pitch.trim()) found.pitch = "Pitch is required.";
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate({ title: title.trim(), pitch: pitch.trim() });
  }

  if (create.isSuccess) {
    return (
      <section
        role="status"
        className="rounded-card border border-success bg-surface-2 p-5"
      >
        <h2 className="text-lg font-semibold">Project created</h2>
        <p className="mt-1 text-sm">
          &ldquo;{create.data.title}&rdquo; was saved as a draft. Add roles
          next, then publish it.
        </p>
        <Link
          href={`/projects/${create.data.id}`}
          className={`${buttonClasses("cta", "sm")} mt-4 mr-3`}
        >
          Add roles
        </Link>
        <button
          type="button"
          className={`${buttonClasses("secondary", "sm")} mt-4`}
          onClick={() => {
            create.reset();
            setTitle("");
            setPitch("");
          }}
        >
          Create another project
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {noTerm && (
        <p role="alert" className={noticeClass}>
          There is no active term yet, so projects can&apos;t be created. Ask an
          admin to add the current term.
        </p>
      )}
      {signedOut && (
        <p role="alert" className={noticeClass}>
          Sign in to create a project.
        </p>
      )}
      {unexpected && (
        <p role="alert" className={noticeClass}>
          Something went wrong. Please try again.
        </p>
      )}

      <div>
        <label htmlFor="project-title" className="font-medium">
          Title
        </label>
        <input
          id="project-title"
          name="title"
          value={title}
          maxLength={TITLE_MAX}
          disabled={create.isPending}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "project-title-error" : undefined}
          className={inputClass}
          onChange={(event) => {
            setTitle(event.target.value);
            setClientErrors((prev) => ({ ...prev, title: undefined }));
          }}
        />
        <p className={helperClass}>
          {title.length}/{TITLE_MAX} characters
        </p>
        {errors.title && (
          <p id="project-title-error" role="alert" className={errorClass}>
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="project-pitch" className="font-medium">
          Pitch
        </label>
        <textarea
          id="project-pitch"
          name="pitch"
          rows={6}
          value={pitch}
          maxLength={PITCH_MAX}
          disabled={create.isPending}
          aria-invalid={Boolean(errors.pitch)}
          aria-describedby={errors.pitch ? "project-pitch-error" : undefined}
          className={inputClass}
          onChange={(event) => {
            setPitch(event.target.value);
            setClientErrors((prev) => ({ ...prev, pitch: undefined }));
          }}
        />
        <p className={helperClass}>
          {pitch.length}/{PITCH_MAX} characters
        </p>
        {errors.pitch && (
          <p id="project-pitch-error" role="alert" className={errorClass}>
            {errors.pitch}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={create.isPending || noTerm}
        className={`${buttonClasses("cta")} self-start`}
      >
        {create.isPending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
