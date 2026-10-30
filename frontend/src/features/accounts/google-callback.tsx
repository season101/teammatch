"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSessionUser } from "./allauth";
import { safeNext } from "./sign-in-form";

// Back to sign in with the error, keeping ?next= for the next try.
function signInUrl(error: string, next?: string) {
  const params = new URLSearchParams({ error });
  if (next) params.set("next", next);
  return `/login?${params}`;
}

// Google sends the browser back here. allauth has already signed the student
// in, or added ?error=<code>, which the sign-in page turns into a message.
export function GoogleCallback({
  error,
  next,
}: {
  error?: string;
  next?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function finish() {
      if (error) {
        router.replace(signInUrl(error, next));
        return;
      }
      // Ask again: the cached "signed out" from before Google is stale now.
      const user = await queryClient
        .fetchQuery({ queryKey: ["session"], queryFn: getSessionUser })
        .catch(() => null);
      // shortcut: Team rules (DD-12) doesn't exist yet, so new users go to the deck too.
      router.replace(user ? safeNext(next) : signInUrl("unknown", next));
    }
    void finish();
  }, [error, next, router, queryClient]);

  return (
    <p role="status" className="text-muted">
      Signing you in…
    </p>
  );
}
