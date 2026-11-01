"use client";

import { Chip } from "@/components/ui/chip";
import { errorClass } from "@/components/ui/form-classes";
import { ProfileStrength } from "@/components/ui/profile-strength";
import { Tabs } from "@/components/ui/tabs";
import { initials } from "@/features/teams/my-team";
import { ProfileForm } from "./profile-form";
import { useMyProfile, type MyProfile } from "./queries";

// DD-10 weights. Avatar (+20%) waits on photo upload (#13), so this tops out at 80.
export function profileStrength(profile: MyProfile) {
  return (
    (profile.major ? 20 : 0) +
    (profile.skills.length > 0 ? 40 : 0) +
    (profile.bio ? 20 : 0)
  );
}

// Me → Profile: the strength meter, then Preview | Edit.
export function ProfileTabs() {
  const profile = useMyProfile();

  if (profile.isPending) {
    return <p className="text-muted">Loading your profile…</p>;
  }
  if (profile.isError) {
    return (
      <p role="alert" className={errorClass}>
        Couldn&apos;t load your profile. Refresh the page to try again.
      </p>
    );
  }
  return (
    <>
      <ProfileStrength value={profileStrength(profile.data)} />
      <Tabs
        label="Profile"
        tabs={[
          {
            id: "preview",
            label: "Preview",
            panel: <ProfilePreview profile={profile.data} />,
          },
          { id: "edit", label: "Edit", panel: <ProfileForm /> },
        ]}
      />
    </>
  );
}

// The applicant card an owner sees, with the bio in place of a note.
function ProfilePreview({ profile }: { profile: MyProfile }) {
  const name = profile.display_name || "Unnamed applicant";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        This is what owners see when you apply.
      </p>
      <article className="overflow-hidden rounded-card border border-border bg-surface">
        <header className="flex items-center gap-3 bg-linear-to-br from-cover-indigo to-[color-mix(in_oklab,var(--color-cover-indigo)_62%,black)] p-5 text-white">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20 font-bold"
          >
            {initials(profile.display_name ?? "")}
          </span>
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            {profile.major && <p className="text-sm">{profile.major}</p>}
          </div>
        </header>
        <div className="flex flex-col gap-4 p-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Skills
            </h3>
            {profile.skills.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <li key={skill.id}>
                    <Chip>{skill.name}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No skills yet.</p>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Bio
            </h3>
            <p className={profile.bio ? "text-text" : "text-sm text-muted"}>
              {profile.bio || "No bio yet."}
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
