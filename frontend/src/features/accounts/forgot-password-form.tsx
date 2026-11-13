"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { allauthPost, type AllauthError } from "./allauth";
import { StatusIcon } from "./auth-layout";
import { buttonClasses } from "@/components/ui/button";

type Status = "idle" | "sending" | "sent";

// Step 1 of a password reset (F1-10): ask for the email, then allauth sends the link.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<AllauthError[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setStatus("sending");
    setErrors([]);
    try {
      const result = await allauthPost("/auth/password/request", { email });
      // 200 whether or not an account exists, so the page can't tell anyone who has one.
      if (result.status === 200) {
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
          We sent an email to <strong className="text-text">{email}</strong>{" "}
          with the next step.
        </p>
        <Link href="/login" className={`${buttonClasses("cta")} w-full`}>
          Back to sign in
        </Link>
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted">
          Enter your school email and we&apos;ll send you a link to set a new
          one. Signed up with Google? This adds a password too.
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
          className="rounded-input border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-pass">
          {errors.map((e) => (
            <li key={`${e.code}-${e.message}`}>{e.message}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={buttonClasses("cta")}
      >
        {status === "sending" ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
