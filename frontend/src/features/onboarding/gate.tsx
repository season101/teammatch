"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/features/accounts/require-sign-in";
import { useMyProfile } from "@/features/profiles/queries";

// Nobody uses the app before agreeing to the Team rules (DD-47). Waits for the
// profile to load, so a signed-out visitor or a slow request never redirects.
export function OnboardingGate() {
  const router = useRouter();
  const { data: user } = useSession();
  const { data: profile } = useMyProfile(Boolean(user));
  const needsRules = Boolean(user) && profile?.rules_accepted_at === null;

  useEffect(() => {
    if (needsRules) router.replace("/welcome/rules");
  }, [needsRules, router]);

  return null;
}
