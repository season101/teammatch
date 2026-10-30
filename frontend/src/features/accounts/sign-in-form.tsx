"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { allauthPost } from "./allauth";
import { googleErrorText } from "./google-button";
import { buttonClasses } from "@/components/ui/button";

// Only follow ?next= to a page on this site, never to another website. Default: the Discover deck.
export function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/feed";
}

export function SignInForm({
  next,
  google,
  googleError,
}: {
  next?: string;
  // The page passes the Google button, shown under the title.
  google?: ReactNode;
  // ?error= from a Google sign-in that didn't work (/auth/callback sends it here)
  googleError?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSending(true);
    setError("");
    setSubmitted(true); // the Google error is about an earlier try, so hide it now
    try {
      const result = await allauthPost("/auth/login", { email, password });
      // 409 means this browser is already signed in, which is fine too
      if (result.status === 200 || result.status === 409) {
        // "all": nothing on this page watches the session, and a stale "signed out"
        // would send the next page straight back here.
        await queryClient.invalidateQueries({
          queryKey: ["session"],
          refetchType: "all",
        });
        router.replace(safeNext(next));
        return;
      }
      if (result.status === 401) {
        setError(
          "Please verify your email first. Check your inbox for the link.",
        );
      } else {
        // The allowed domains are public (BR-01), so naming them gives nothing away.
        const domainError = result.errors.find(
          (e) => e.code === "email_domain_not_allowed",
        );
        // Same message for a wrong email or a wrong password (F1-02).
        setError(domainError?.message ?? "Email or password is incorrect.");
      }
    } catch {
      setError("Can't reach the server. Try again.");
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {googleError && !submitted && (
        <p
          role="alert"
          className="rounded-card border border-pass bg-surface-2 p-3 text-sm text-text"
        >
          {googleErrorText(googleError)}
        </p>
      )}

      <h1 className="text-2xl font-bold">Sign in to TeamMatch</h1>
      {google}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          School email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-input border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-input border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}

      <button type="submit" disabled={sending} className={buttonClasses("cta")}>
        {sending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
