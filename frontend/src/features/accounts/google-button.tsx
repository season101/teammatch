"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { continueWith, getProviders } from "./allauth";

// "Continue with Google" above the email form (screens 2 and 3). Hidden when
// the server has no Google keys, e.g. a laptop without GOOGLE_CLIENT_ID.
export function GoogleButton() {
  const providers = useQuery({
    queryKey: ["auth-providers"],
    queryFn: getProviders,
    staleTime: Infinity,
  });
  const [leaving, setLeaving] = useState(false);

  if (!providers.data?.includes("google")) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          void continueWith("google");
        }}
        className={buttonClasses("secondary")}
      >
        {leaving ? "Opening Google…" : "Continue with Google"}
      </button>
      <p className="flex items-center gap-3 text-xs text-muted uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        or
      </p>
    </div>
  );
}

// What /auth/callback?error=<code> means, in words a student can act on.
const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  google_account_not_allowed:
    "Use your @email.latech.edu Google account, or sign in with email and password.",
  email_domain_not_allowed: "Use your @latech.edu or @email.latech.edu email.",
};

export function googleErrorText(code: string) {
  return GOOGLE_ERRORS[code] ?? "Couldn't sign in with Google. Try again.";
}
