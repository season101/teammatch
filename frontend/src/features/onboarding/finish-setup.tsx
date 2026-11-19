"use client";

import Link from "next/link";
import { useSession } from "@/features/accounts/require-sign-in";
import { useMyApplications } from "@/features/applications/queries";
import { useMyProfile } from "@/features/profiles/queries";
import { useMyProjects } from "@/features/review/queries";

// What's left after sign-up, in the desktop nav column. Gone once all three are done.
// Students only.
export function FinishSetup() {
  const { data: user } = useSession();
  const profile = useMyProfile(Boolean(user)).data;
  const applications = useMyApplications(Boolean(user)).data;
  const projects = useMyProjects(Boolean(user)).data;
  // Moderators and admins have no deck, so nothing here fits them.
  if (!user || !profile || !applications || !projects || (profile.role ?? "student") !== "student")
    return null;

  const items = [
    {
      label: "Agree to team rules",
      href: "/welcome/rules",
      done: Boolean(profile.rules_accepted_at),
    },
    {
      label: "Add your skills",
      href: "/welcome/skills",
      done: profile.skills.length > 0,
    },
    {
      label: "Apply to your first role",
      href: "/feed",
      // Posting a project is the owner's way in, so it counts too.
      done: applications.length > 0 || projects.length > 0,
    },
  ];
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;
  const next = items.find((item) => !item.done);

  return (
    <section
      aria-labelledby="finish-setup"
      className="rounded-row border border-border bg-surface-2 p-3 text-sm"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="finish-setup" className="font-semibold">
          Finish setup
        </h2>
        <span className="text-xs text-muted">
          {done} of {items.length}
        </span>
      </div>
      <ul className="mt-1 flex flex-col">
        {items.map((item) => (
          <li key={item.label} className="flex min-h-8 items-center">
            {item.done ? (
              <span className="text-muted line-through">
                {item.label}
                <span className="sr-only"> (done)</span>
              </span>
            ) : item === next ? (
              <Link
                href={item.href}
                className="flex min-h-11 flex-1 items-center font-medium underline underline-offset-4"
              >
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
