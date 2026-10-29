"use client";

import { useId, useState, type FormEvent } from "react";
import type { Skill } from "@/features/profiles/queries";
import { SkillPicker } from "@/features/profiles/skill-picker";
import type { ApiError, RoleInput } from "./queries";
import { buttonClasses } from "@/components/ui/button";
import {
  errorClass,
  inputClass,
  noticeClass,
} from "@/components/ui/form-classes";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;

type Props = {
  skills: Skill[];
  initial?: RoleInput;
  submitLabel: string;
  pending: boolean;
  failure?: ApiError | null;
  onSubmit: (input: RoleInput) => void;
  onCancel: () => void;
};

export function RoleForm({
  skills,
  initial,
  submitLabel,
  pending,
  failure,
  onSubmit,
  onCancel,
}: Props) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [skillIds, setSkillIds] = useState<number[]>(
    initial?.required_skills ?? [],
  );
  const [errors, setErrors] = useState<{ title?: string; skills?: string }>({});

  const titleError = errors.title ?? failure?.fields.title;
  const skillError = errors.skills ?? failure?.fields.required_skills;
  const generalError =
    failure && !titleError && !skillError
      ? failure.message || "Something went wrong. Please try again."
      : "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: { title?: string; skills?: string } = {};
    if (!title.trim()) found.title = "Title is required.";
    if (skillIds.length === 0) found.skills = "Pick at least one skill.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      required_skills: skillIds,
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      {generalError && (
        <p role="alert" className={noticeClass}>
          {generalError}
        </p>
      )}

      <div>
        <label htmlFor={`${id}-title`} className="font-medium">
          Role title
        </label>
        <input
          id={`${id}-title`}
          value={title}
          placeholder="e.g. Backend developer"
          maxLength={TITLE_MAX}
          disabled={pending}
          className={inputClass}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
        />
        {titleError && (
          <p role="alert" className={errorClass}>
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-description`} className="font-medium">
          Role description
        </label>
        <textarea
          id={`${id}-description`}
          rows={3}
          value={description}
          maxLength={DESCRIPTION_MAX}
          disabled={pending}
          className={inputClass}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <SkillPicker
        skills={skills}
        selected={skillIds}
        disabled={pending}
        error={skillError}
        onChange={(ids) => {
          setSkillIds(ids);
          setErrors((prev) => ({ ...prev, skills: undefined }));
        }}
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses("cta", "sm")}
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          className={buttonClasses("secondary", "sm")}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
