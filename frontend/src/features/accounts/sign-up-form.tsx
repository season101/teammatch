"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { allauthPost, type AllauthError } from "./allauth";
import { StatusIcon } from "./auth-layout";
import { buttonClasses } from "@/components/ui/button";
import { PendingLabel } from "@/components/ui/pending-label";

type Status = "idle" | "sending" | "sent";

function errorText(error: AllauthError) {
  if (error.code === "email_taken")
    return "An account with this email exists. Sign in instead.";
  return error.message;
}

// Always in the page, so screen readers announce a message when it appears.
function FieldErrors({ id, errors }: { id: string; errors: AllauthError[] }) {
  return (
    <p id={id} role="alert" className="text-sm text-pass empty:hidden">
      {errors.map(errorText).join(" ")}
    </p>
  );
}

// Sign in or sign up passes the email from its first step, and swaps this form
// for sign-in in place so the email isn't typed twice.
export function SignUpForm({
  initialEmail = "",
  onSwitch,
}: {
  initialEmail?: string;
  onSwitch?: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<AllauthError[]>([]);
  // "sending" | "sent" | "failed" for the Resend button on Check your inbox.
  const [resend, setResend] = useState("");

  // allauth has no resend for link verification, but signing in to an unverified
  // account sends the link again (and rate-limits it), so Resend does that.
  async function handleResend() {
    setResend("sending");
    try {
      const result = await allauthPost("/auth/login", { email, password });
      setResend(result.status === 401 ? "sent" : "failed");
    } catch {
      setResend("failed");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    // Our own checks, shown under the field; the browser's bubbles are off (noValidate).
    // The server owns the allowed domains and answers with param "email".
    const invalid: AllauthError[] = [];
    if (!/^\S+@\S+$/.test(email.trim()))
      invalid.push({ code: "invalid", param: "email", message: "Enter your school email." });
    if (password.length < 8)
      invalid.push({ code: "invalid", param: "password", message: "Use 8 or more characters." });
    if (invalid.length) {
      setErrors(invalid);
      return;
    }
    setStatus("sending");
    setErrors([]);
    try {
      const result = await allauthPost("/auth/signup", { email, password });
      // 401 means the account was made and is waiting for email verification
      if (result.status === 200 || result.status === 401) {
        setStatus("sent");
        return;
      }
      setErrors(
        result.errors.length
          ? result.errors
          : [{ code: "unknown", message: "Something went wrong. Try again." }],
      );
    } catch {
      setErrors([
        { code: "network", message: "Can't reach the server. Try again." },
      ]);
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <section
        aria-labelledby="sent-heading"
        className="flex flex-col items-center gap-3 text-center"
      >
        <StatusIcon name="mail" />
        <h1 id="sent-heading" className="font-display text-2xl font-extrabold">
          Check your inbox
        </h1>
        <p role="status" className="text-muted">
          We sent a link to <strong className="text-text">{email}</strong>. Open
          it to finish signing up. The link works for 3 days. Check spam if it
          isn&apos;t there.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resend === "sending" || resend === "sent"}
          className={buttonClasses("secondary", "sm")}
        >
          {resend === "sent" ? "Email sent again" : "Resend email"}
        </button>
        {resend === "failed" && (
          <p role="alert" className="text-sm text-pass">
            Couldn&apos;t resend yet. Wait a few minutes and try again.
          </p>
        )}
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={buttonClasses("ghost", "sm")}
        >
          Use a different email
        </button>
      </section>
    );
  }

  const emailTaken = errors.some((e) => e.code === "email_taken");
  const fieldErrors = (param: string) =>
    errors.filter((e) => e.param === param && e.code !== "email_taken");
  const emailErrors = fieldErrors("email");
  const passwordErrors = fieldErrors("password");
  const otherErrors = errors.filter(
    (e) => !emailErrors.includes(e) && !passwordErrors.includes(e),
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold">
          Find your <em>team</em>.
        </h1>
        <p className="text-sm text-muted">
          Use your @latech.edu or @email.latech.edu email.
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
          aria-invalid={emailErrors.length > 0}
          aria-describedby="email-error"
          className="min-h-11 rounded-input border border-border-control bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50 aria-invalid:border-pass"
        />
        <FieldErrors id="email-error" errors={emailErrors} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          // The email is already filled in, so the password is what's left.
          autoFocus={Boolean(initialEmail)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={passwordErrors.length > 0}
          aria-describedby="password-hint password-error"
          className="min-h-11 rounded-input border border-border-control bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50 aria-invalid:border-pass"
        />
        <FieldErrors id="password-error" errors={passwordErrors} />
        <p id="password-hint" className="text-xs text-muted">
          8 or more characters. Not all numbers, and not close to your email.
        </p>
      </div>

      {otherErrors.length > 0 && (
        <ul role="alert" className="text-sm text-pass">
          {otherErrors.map((e) => (
            <li key={`${e.code}-${e.message}`}>{errorText(e)}</li>
          ))}
        </ul>
      )}
      {emailTaken && (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center self-start text-sm font-medium text-primary underline"
        >
          Go to sign in
        </Link>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={buttonClasses("cta")}
      >
        <PendingLabel pending={status === "sending"} label="Creating account">Sign up</PendingLabel>
      </button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        {onSwitch ? (
          <button
            type="button"
            onClick={() => onSwitch(email)}
            className="inline-flex min-h-11 items-center font-medium text-primary underline"
          >
            Sign in
          </button>
        ) : (
          <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline">
            Sign in
          </Link>
        )}
      </p>
    </form>
  );
}
