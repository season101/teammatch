"use client";

import { useState, type FormEvent } from "react";
import { SkillPicker } from "./skill-picker";
import {
  useMyProfile,
  useSaveProfile,
  useSkills,
  type MyProfile,
  type Skill,
} from "./queries";

// Same limits as the Profile model.
const NAME_MAX = 80;
const BIO_MAX = 500;
const MAJOR_MAX = 100;

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";
const errorClass = "mt-1 text-sm text-rose-600 dark:text-rose-400";

export function ProfileForm() {
  const profile = useMyProfile();
  const skills = useSkills();

  if (profile.isPending || skills.isPending) {
    return <p className="text-zinc-500">Loading your profile…</p>;
  }
  if (profile.isError || skills.isError) {
    return (
      <p role="alert" className={errorClass}>
        Couldn&apos;t load your profile. Refresh the page to try again.
      </p>
    );
  }
  return <ProfileFields profile={profile.data} skills={skills.data} />;
}

function ProfileFields({
  profile,
  skills,
}: {
  profile: MyProfile;
  skills: Skill[];
}) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [major, setMajor] = useState(profile.major ?? "");
  const [skillIds, setSkillIds] = useState(
    profile.skills.map((skill) => skill.id),
  );
  const save = useSaveProfile();

  const errors = save.error?.fields ?? {};
  const unexpected = save.isError && Object.keys(errors).length === 0;

  // Any new edit hides the last "saved" or error message.
  function edited() {
    if (!save.isIdle) save.reset();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({
      display_name: displayName.trim(),
      bio: bio.trim(),
      major: major.trim(),
      skill_ids: skillIds,
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="display-name" className="font-medium">
          Display name
        </label>
        <input
          id="display-name"
          value={displayName}
          maxLength={NAME_MAX}
          disabled={save.isPending}
          aria-invalid={Boolean(errors.display_name)}
          className={inputClass}
          onChange={(event) => {
            setDisplayName(event.target.value);
            edited();
          }}
        />
        {errors.display_name && (
          <p role="alert" className={errorClass}>
            {errors.display_name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="major" className="font-medium">
          Major
        </label>
        <input
          id="major"
          value={major}
          maxLength={MAJOR_MAX}
          disabled={save.isPending}
          aria-invalid={Boolean(errors.major)}
          className={inputClass}
          onChange={(event) => {
            setMajor(event.target.value);
            edited();
          }}
        />
        {errors.major && (
          <p role="alert" className={errorClass}>
            {errors.major}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className="font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          rows={5}
          value={bio}
          maxLength={BIO_MAX}
          disabled={save.isPending}
          aria-invalid={Boolean(errors.bio)}
          className={inputClass}
          onChange={(event) => {
            setBio(event.target.value);
            edited();
          }}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {bio.length}/{BIO_MAX} characters
        </p>
        {errors.bio && (
          <p role="alert" className={errorClass}>
            {errors.bio}
          </p>
        )}
      </div>

      <SkillPicker
        skills={skills}
        selected={skillIds}
        disabled={save.isPending}
        error={errors.skill_ids}
        onChange={(ids) => {
          setSkillIds(ids);
          edited();
        }}
      />

      {save.isSuccess && (
        <p
          role="status"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          Profile saved.
        </p>
      )}
      {unexpected && (
        <p role="alert" className={errorClass}>
          Couldn&apos;t save your profile. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={save.isPending}
        className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
