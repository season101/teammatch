"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSessionUser } from "./allauth";

// Google sends the browser back here. allauth has already signed the student
// in, or added ?error=<code>, which the sign-in page turns into a message.
export function GoogleCallback({ error }: { error?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function finish() {
      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }
      // Ask again: the cached "signed out" from before Google is stale now.
      const user = await queryClient
        .fetchQuery({ queryKey: ["session"], queryFn: getSessionUser })
        .catch(() => null);
      // shortcut: Team rules (DD-12) doesn't exist yet, so new users go to the deck too.
      router.replace(user ? "/feed" : "/login?error=unknown");
    }
    void finish();
  }, [error, router, queryClient]);

  return (
    <p role="status" className="text-muted">
      Signing you in…
    </p>
  );
}
