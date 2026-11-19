"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { allauthPost, getSessionUser, signOut } from "./allauth";
import { CheckInbox } from "./forgot-password-form";
import { Button, buttonClasses } from "@/components/ui/button";
import { PendingLabel } from "@/components/ui/pending-label";

// Only follow ?next= to a page on this site, never to another website. Default: the Discover deck.
// Checks the address the browser would build from it, not the raw text: browsers
// read "/\evil.com" as "//evil.com" and drop tabs and newlines.
export function safeNext(next: string | undefined) {
  if (!next) return "/feed";
  // No window on the server. Any origin works there, since only the path is kept.
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  let url: URL;
  try {
    url = new URL(next, origin);
  } catch {
    return "/feed"; // not an address at all, like "https://"
  }
  // "/.//evil.com" stays on this site but tidies up to the path "//evil.com",
  // which the browser reads as another website.
  if (url.origin !== origin || url.pathname.startsWith("//")) return "/feed";
  return url.pathname + url.search + url.hash;
}

export function SignInForm({
  next,
  initialEmail = "",
  onSwitch,
}: {
  next?: string;
  // Sign in or sign up passes the email from its first step, and swaps this
  // form for sign-up in place so the email isn't typed twice.
  initialEmail?: string;
  onSwitch?: (email: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // F1-13: the email of a Google-only account, for the Set a password prompt.
  const [googleOnly, setGoogleOnly] = useState("");
  const [requesting, setRequesting] = useState(false);
  // Where the set-password link went; shows Check your inbox when set.
  const [sentTo, setSentTo] = useState("");
  // Counts sign-in tries, so a link request can tell a newer one started.
  const signIns = useRef(0);
  // A refused sign-in: the password field is marked, takes focus and shakes once.
  // `attempt` only restarts the shake; typing clears the mark.
  const [attempt, setAttempt] = useState(0);
  const [refused, setRefused] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Also on arrival with the email already filled in: the password is what's left.
  useEffect(() => {
    if (attempt || initialEmail) passwordRef.current?.focus();
  }, [attempt, initialEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    signIns.current += 1;
    setSending(true);
    setError("");
    setGoogleOnly("");
    try {
      let result = await allauthPost("/auth/login", { email, password });
      // 409: the password was right, but someone else is still signed in on this
      // browser (a shared lab PC). Sign them out and try once more.
      if (result.status === 409) {
        await signOut();
        result = await allauthPost("/auth/login", { email, password });
      }
      if (result.status === 200) {
        // Drop whatever is cached from before (maybe another account's profile),
        // then load the new session: a stale "signed out" would send the next
        // page straight back here.
        queryClient.clear();
        await queryClient.fetchQuery({
          queryKey: ["session"],
          queryFn: getSessionUser,
        });
        router.replace(safeNext(next));
        return;
      }
      if (result.status === 401) {
        setError(
          "Please verify your email first. Check your inbox for the link.",
        );
      } else if (
        result.errors.some((e) => e.code === "google_only_account")
      ) {
        // The one exception to the single error (DD-37): offer a password instead.
        setGoogleOnly(email);
      } else {
        // The allowed domains are public (BR-01), so naming them gives nothing away.
        const domainError = result.errors.find(
          (e) => e.code === "email_domain_not_allowed",
        );
        // Same message for a wrong email or a wrong password (F1-02).
        setError(domainError?.message ?? "Email or password is incorrect.");
        if (!domainError) {
          setRefused(true);
          setAttempt((n) => n + 1);
        }
      }
    } catch {
      setError("Can't reach the server. Try again.");
    }
    setSending(false);
  }

  // The same request as Forgot password (screen 36): the emailed link sets one.
  async function requestPassword() {
    const to = googleOnly;
    const signIn = signIns.current;
    setRequesting(true);
    setError("");
    let failure = "";
    try {
      const result = await allauthPost("/auth/password/request", { email: to });
      if (result.status !== 200)
        failure = result.errors[0]?.message ?? "Something went wrong. Try again.";
    } catch {
      failure = "Can't reach the server. Try again.";
    }
    setRequesting(false);
    // A sign-in started meanwhile (maybe for another email): this answer is stale.
    if (signIn !== signIns.current) return;
    if (failure) setError(failure);
    else setSentTo(to);
  }

  if (sentTo) {
    return (
      <CheckInbox email={sentTo}>
        <Button
          variant="cta"
          className="w-full"
          onClick={() => {
            setSentTo("");
            setGoogleOnly("");
          }}
        >
          Back to sign in
        </Button>
      </CheckInbox>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold">Welcome back.</h1>
        <p className="text-sm text-muted">
          Sign in with your @latech.edu or @email.latech.edu account.
        </p>
      </div>

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
          className="min-h-11 rounded-input border border-border-control bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
      </div>

      <div
        key={attempt}
        className={`flex flex-col gap-1 ${attempt ? "motion-safe:animate-shake" : ""}`}
      >
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="password"
          required
          autoComplete="current-password"
          ref={passwordRef}
          aria-invalid={refused}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setRefused(false);
          }}
          aria-describedby={refused ? "password-error" : undefined}
        />
        {/* A refused password is about this field, so it says so here, with what to do. */}
        {refused && error && (
          <p id="password-error" role="alert" className="text-sm text-pass">
            {error} <span>Try again or reset your password.</span>
          </p>
        )}
        <Link
          href="/reset-password"
          className="inline-flex min-h-11 items-center self-end text-sm font-medium text-primary underline"
        >
          Forgot password?
        </Link>
      </div>

      {/* Hidden again once the email is changed: it was about that address. */}
      {googleOnly && googleOnly === email && (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <p role="alert" className="text-sm text-text">
            This email signs in with Google. Want to set a password too?
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={requestPassword}
            disabled={requesting}
          >
            <PendingLabel pending={requesting} label="Sending link">
              Set a password
            </PendingLabel>
          </Button>
        </div>
      )}

      {error && !refused && (
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}

      <button type="submit" disabled={sending} className={buttonClasses("cta")}>
        <PendingLabel pending={sending} label="Signing in">Sign in</PendingLabel>
      </button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        {onSwitch ? (
          <button
            type="button"
            onClick={() => onSwitch(email)}
            className="inline-flex min-h-11 items-center font-medium text-primary underline"
          >
            Sign up
          </button>
        ) : (
          <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-primary underline">
            Sign up
          </Link>
        )}
      </p>
    </form>
  );
}
