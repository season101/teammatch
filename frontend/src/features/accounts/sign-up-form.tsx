"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { allauthPost, type AllauthError } from "./allauth";
import { buttonClasses } from "@/components/ui/button";

type Status = "idle" | "sending" | "sent";

function errorText(error: AllauthError) {
  if (error.code === "email_taken")
    return "An account with this email exists. Sign in instead.";
  return error.message;
}

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<AllauthError[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
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
      <section aria-labelledby="sent-heading" className="flex flex-col gap-3">
        <h1 id="sent-heading" className="text-2xl font-bold">
          Check your email
        </h1>
        <p role="status">
          We sent a link to <strong>{email}</strong>. Click it to verify your
          account.
        </p>
      </section>
    );
  }

  const emailTaken = errors.some((e) => e.code === "email_taken");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create your TeamMatch account</h1>

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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-hint"
          className="rounded-input border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
        <p id="password-hint" className="text-xs text-muted">
          At least 8 characters.
        </p>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-pass">
          {errors.map((e) => (
            <li key={`${e.code}-${e.message}`}>{errorText(e)}</li>
          ))}
        </ul>
      )}
      {emailTaken && (
        <Link
          href="/login"
          className="text-sm font-medium text-primary underline"
        >
          Go to sign in
        </Link>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className={buttonClasses("cta")}
      >
        {status === "sending" ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
