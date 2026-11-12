"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  errorClass,
  helperClass,
  inputClass,
} from "@/components/ui/form-classes";
import { ProfileStrength } from "@/components/ui/profile-strength";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Logo } from "@/features/landing/logo";
import { profileStrength } from "@/features/profiles/profile-tabs";
import {
  useAcceptRules,
  useMyProfile,
  useSaveProfile,
  useSkills,
  type MyProfile,
} from "@/features/profiles/queries";
import { SkillPicker } from "@/features/profiles/skill-picker";
import { StepProgress } from "./step-progress";

// Same limits as the Profile model.
const NAME_MAX = 80;
const BIO_MAX = 500;
const MAJOR_MAX = 100;

const RULES = [
  "Be honest about your skills.",
  "Show up.",
  "Respect people's time.",
  "Speak up early.",
];

// Where setup continues: the first step that isn't done, or the deck (DD-47).
export function nextStep(profile: MyProfile) {
  if (!profile.rules_accepted_at) return "/welcome/rules";
  if (!profile.display_name?.trim() || !profile.major?.trim())
    return "/welcome/profile";
  if (profile.skills.length === 0) return "/welcome/skills";
  return "/feed";
}

// A welcome screen: no app navigation, sign-in only. It shows its step only
// when that's the next one to do. Saving updates the cached profile, so the
// same check is what moves on to the next screen.
function Screen({
  path,
  children,
}: {
  path: string;
  children: (profile: MyProfile) => ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6 sm:flex-none sm:py-16">
      <Logo className="text-lg" />
      <RequireSignIn>
        {() => <CurrentStep path={path}>{children}</CurrentStep>}
      </RequireSignIn>
    </main>
  );
}

function CurrentStep({
  path,
  children,
}: {
  path: string;
  children: (profile: MyProfile) => ReactNode;
}) {
  const router = useRouter();
  const profile = useMyProfile();
  // Wait for a fresh copy, like the profile form: a cached one can be out of date.
  const next =
    profile.data && profile.isFetchedAfterMount
      ? nextStep(profile.data)
      : undefined;

  useEffect(() => {
    if (next && next !== path) router.replace(next);
  }, [next, path, router]);

  if (profile.isError) {
    return (
      <p role="alert" className={errorClass}>
        Couldn&apos;t load your profile. Refresh the page to try again.
      </p>
    );
  }
  if (!profile.data || next !== path) {
    return <p className="text-muted">Loading…</p>;
  }
  return <>{children(profile.data)}</>;
}

// Progress, title, body, then the one button at the bottom.
function StepForm({
  step,
  title,
  line,
  cta,
  disabled = false,
  pending,
  failed,
  onSubmit,
  children,
}: {
  step: number;
  title: string;
  line: string;
  cta: string;
  disabled?: boolean;
  pending: boolean;
  failed: boolean;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      noValidate
      className="flex flex-1 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !pending) onSubmit();
      }}
    >
      <StepProgress step={step} />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        <p className="text-muted">{line}</p>
      </header>
      {children}
      <div className="mt-auto flex flex-col gap-3 pt-2 sm:mt-0">
        {failed && (
          <p role="alert" className={errorClass}>
            Couldn&apos;t save that. Check your connection and try again.
          </p>
        )}
        <Button type="submit" disabled={disabled || pending} className="w-full">
          {pending ? "Saving…" : cta}
        </Button>
      </div>
    </form>
  );
}

export function RulesStep() {
  return <Screen path="/welcome/rules">{() => <Rules />}</Screen>;
}

function Rules() {
  const accept = useAcceptRules();
  return (
    <StepForm
      step={1}
      title="Team rules"
      line="Everyone agrees to the same four before they see a role."
      cta="I agree"
      pending={accept.isPending}
      failed={accept.isError}
      onSubmit={() => accept.mutate()}
    >
      <ol className="flex flex-col gap-2">
        {RULES.map((rule, index) => (
          <li
            key={rule}
            className="flex min-h-13 items-center gap-3 rounded-row border border-border bg-surface px-4 font-medium"
          >
            <span aria-hidden="true" className="font-mono text-sm text-muted">
              {index + 1}
            </span>
            {rule}
          </li>
        ))}
      </ol>
    </StepForm>
  );
}

export function ProfileStep() {
  return (
    <Screen path="/welcome/profile">
      {(profile) => <Info profile={profile} />}
    </Screen>
  );
}

function Info({ profile }: { profile: MyProfile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [major, setMajor] = useState(profile.major ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const save = useSaveProfile();
  const errors = save.error?.fields ?? {};

  return (
    <StepForm
      step={2}
      title="Confirm your info"
      line="Fix anything that's off."
      cta="Continue"
      disabled={!displayName.trim() || !major.trim()}
      pending={save.isPending}
      failed={save.isError && Object.keys(errors).length === 0}
      onSubmit={() =>
        save.mutate({
          display_name: displayName.trim(),
          major: major.trim(),
          bio: bio.trim(),
        })
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="welcome-name" className="font-medium">
            Name
          </label>
          <input
            id="welcome-name"
            required
            autoComplete="name"
            value={displayName}
            maxLength={NAME_MAX}
            disabled={save.isPending}
            aria-invalid={Boolean(errors.display_name)}
            aria-describedby="welcome-name-help"
            className={`${inputClass} min-h-11`}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <p id="welcome-name-help" className={helperClass}>
            Your name is shown to project owners.
          </p>
          {errors.display_name && (
            <p role="alert" className={errorClass}>
              {errors.display_name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="welcome-major" className="font-medium">
            Major
          </label>
          <input
            id="welcome-major"
            required
            value={major}
            maxLength={MAJOR_MAX}
            disabled={save.isPending}
            aria-invalid={Boolean(errors.major)}
            className={`${inputClass} min-h-11`}
            onChange={(event) => setMajor(event.target.value)}
          />
          {errors.major && (
            <p role="alert" className={errorClass}>
              {errors.major}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="welcome-bio" className="font-medium">
            Bio <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="welcome-bio"
            rows={3}
            value={bio}
            maxLength={BIO_MAX}
            disabled={save.isPending}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby="welcome-bio-help"
            className={inputClass}
            onChange={(event) => setBio(event.target.value)}
          />
          <p id="welcome-bio-help" className={helperClass}>
            You can add this later from your profile.
          </p>
          {errors.bio && (
            <p role="alert" className={errorClass}>
              {errors.bio}
            </p>
          )}
        </div>
      </div>
    </StepForm>
  );
}

export function SkillsStep() {
  return (
    <Screen path="/welcome/skills">
      {(profile) => <Skills profile={profile} />}
    </Screen>
  );
}

function Skills({ profile }: { profile: MyProfile }) {
  const skills = useSkills();
  // This step only shows with no skills saved, so the picks start empty.
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const save = useSaveProfile();
  const picked =
    skills.data?.filter((skill) => skillIds.includes(skill.id)) ?? [];
  const count = picked.length;

  return (
    <StepForm
      step={3}
      title="What can you do?"
      line="Pick every skill you'd use on a team. Your skills decide which roles you see first."
      cta={`Continue · ${count} ${count === 1 ? "skill" : "skills"}`}
      disabled={count === 0}
      pending={save.isPending}
      failed={save.isError && !save.error.fields.skill_ids}
      onSubmit={() => save.mutate({ skill_ids: skillIds })}
    >
      {skills.isPending ? (
        <p className="text-muted">Loading skills…</p>
      ) : skills.isError ? (
        <p role="alert" className={errorClass}>
          Couldn&apos;t load the skill list. Refresh the page to try again.
        </p>
      ) : (
        <>
          <SkillPicker
            skills={skills.data}
            selected={skillIds}
            disabled={save.isPending}
            error={save.error?.fields.skill_ids}
            onChange={setSkillIds}
          />
          <ProfileStrength
            value={profileStrength({ ...profile, skills: picked })}
          />
        </>
      )}
    </StepForm>
  );
}
