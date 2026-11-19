"use client";

import { buttonClasses } from "@/components/ui/button";
import {
  errorClass,
  helperClass,
  inputClass,
} from "@/components/ui/form-classes";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PendingLabel } from "@/components/ui/pending-label";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/link-card";
import { useState, type FormEvent, type ReactNode } from "react";
import { AvatarField } from "./avatar-field";
import { ResumeField } from "./resume-field";
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
const LINK_MAX = 200;

export function ProfileForm() {
  const profile = useMyProfile();
  const skills = useSkills();

  // Wait for a fresh copy: the fields are filled once, and a cached profile can
  // belong to someone else who used this browser. Saving would copy it over.
  if (profile.isPending || !profile.isFetchedAfterMount || skills.isPending) {
    return <SkeletonRows label="Loading your profile" />;
  }
  if (profile.isError || skills.isError) {
    return (
      <p role="alert" className={errorClass}>
        Couldn&apos;t load your profile. Refresh the page to try again.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <AvatarField profile={profile.data} />
      <ProfileFields profile={profile.data} skills={skills.data} />
    </div>
  );
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
  const [github, setGithub] = useState(profile.github_url ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const save = useSaveProfile();
  // Edited since the last save, so leaving for the resume viewer asks first (forms.md).
  const [touched, setTouched] = useState(false);

  const errors = save.error?.fields ?? {};
  const unexpected = save.isError && Object.keys(errors).length === 0;

  // Any new edit hides the last "saved" or error message.
  function edited() {
    setTouched(true);
    if (!save.isIdle) save.reset();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({
      display_name: displayName.trim(),
      bio: bio.trim(),
      major: major.trim(),
      skill_ids: skillIds,
      github_url: github.trim(),
      linkedin_url: linkedin.trim(),
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
        <p className={helperClass}>
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

      {/* What's above is on your card; the rest only adds to it. */}
      <p className="border-t border-border pt-4 text-xs font-semibold tracking-wider text-muted uppercase">
        Optional
      </p>
      <LinkField
        id="github"
        label="GitHub"
        icon={<GitHubIcon />}
        placeholder="https://github.com/you"
        value={github}
        error={errors.github_url}
        disabled={save.isPending}
        onChange={(value) => {
          setGithub(value);
          edited();
        }}
      />
      <LinkField
        id="linkedin"
        label="LinkedIn"
        icon={<LinkedInIcon />}
        placeholder="https://linkedin.com/in/you"
        value={linkedin}
        error={errors.linkedin_url}
        disabled={save.isPending}
        onChange={(value) => {
          setLinkedin(value);
          edited();
        }}
      />

      <ResumeField profile={profile} unsaved={touched && !save.isSuccess} />

      {save.isSuccess && (
        <p role="status" className="text-sm text-success">
          Profile saved.
        </p>
      )}
      {unexpected && (
        <p role="alert" className={errorClass}>
          Couldn&apos;t save your profile. Please try again.
        </p>
      )}

      {/* The form is long, so Save stays in reach: above the phone tab bar, else at the bottom. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex border-t border-border bg-bg px-4 py-3 sm:bottom-0">
        <button type="submit" disabled={save.isPending} className={buttonClasses("cta")}>
          <PendingLabel pending={save.isPending} label="Saving">Save profile</PendingLabel>
        </button>
      </div>
    </form>
  );
}

// GitHub or LinkedIn (F1-15). The server checks the address and its message shows here.
function LinkField({
  id,
  label,
  icon,
  placeholder,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  placeholder: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder={placeholder}
        value={value}
        maxLength={LINK_MAX}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-hint`} className={helperClass}>
        Optional. Adds 5% to profile strength.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}
