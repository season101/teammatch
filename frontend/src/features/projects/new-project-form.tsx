"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCreateProject, type FieldErrors } from "./queries";

const TITLE_MAX = 100;
const PITCH_MAX = 2000;

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";
const errorClass = "mt-1 text-sm text-rose-600 dark:text-rose-400";
const noticeClass =
  "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100";

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
        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950"
      >
        <h2 className="text-lg font-semibold">Project created</h2>
        <p className="mt-1 text-sm">
          &ldquo;{create.data.title}&rdquo; was saved as a draft. Add roles
          next, then publish it.
        </p>
        <Link
          href={`/projects/${create.data.id}`}
          className="mt-4 mr-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add roles
        </Link>
        <button
          type="button"
          className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
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
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
        className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {create.isPending ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
