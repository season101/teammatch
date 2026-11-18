"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/features/accounts/require-sign-in";
import { useMyProfile } from "@/features/profiles/queries";

// Where a moderator or admin lands. Students land on the deck, which staff don't get.
export const STAFF_HOME = { admin: "/moderation", moderator: "/teams" } as const;
const STUDENT_ONLY = ["/feed", "/applications", "/applicants", "/projects/new"];

// Nobody uses the app before agreeing to the Team rules (DD-47). Waits for the
// profile to load, so a signed-out visitor or a slow request never redirects.
// It also sends moderators and admins from the student screens to their own page.
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useSession();
  const { data: profile } = useMyProfile(Boolean(user));
  const needsRules = Boolean(user) && profile?.rules_accepted_at === null;

  const role = user ? profile?.role : undefined;
  const home = role && role !== "student" && STUDENT_ONLY.includes(pathname) && STAFF_HOME[role];

  useEffect(() => {
    if (needsRules) router.replace("/welcome/rules");
    else if (home) router.replace(home);
  }, [needsRules, home, router]);

  return null;
}
