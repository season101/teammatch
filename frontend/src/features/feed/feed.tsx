"use client";

import { useMyProfile } from "@/features/profiles/queries";
import { ApplyForm } from "./apply-form";
import { PassButton } from "./pass-button";
import { useFeed } from "./queries";
import { RoleCard } from "./role-card";

export function Feed() {
  const feed = useFeed();
  // Only used to highlight matching skills, so the feed doesn't wait for it.
  const profile = useMyProfile();
  const mySkillIds = profile.data?.skills.map((skill) => skill.id) ?? [];

  if (feed.isPending) {
    return <p className="text-muted">Loading open roles…</p>;
  }
  if (feed.isError) {
    return (
      <p role="alert" className="text-pass">
        Couldn&apos;t load roles. Refresh the page to try again.
      </p>
    );
  }
  if (feed.data.length === 0) {
    return (
      <p className="text-muted">No open roles right now. Check back later.</p>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {feed.data.map((role) => (
        <li key={role.id}>
          <RoleCard role={role} mySkillIds={mySkillIds}>
            <ApplyForm roleId={role.id} />
            <PassButton roleId={role.id} />
          </RoleCard>
        </li>
      ))}
    </ul>
  );
}
