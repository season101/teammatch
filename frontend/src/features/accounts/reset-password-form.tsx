"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { allauthPost, type AllauthError } from "./allauth";
import { StatusIcon } from "./auth-layout";
import { buttonClasses } from "@/components/ui/button";

type Status = "checking" | "ready" | "sending" | "done" | "expired";

// Is the key from the email still good? A GET only checks it; it doesn't use it up.
async function keyIsValid(key: string) {
  const response = await fetch("/_allauth/browser/v1/auth/password/reset", {
    credentials: "same-origin",
    headers: { "X-Password-Reset-Key": key },
  });
  return response.status === 200;
}

// Step 2 of a password reset (F1-10): the link in the email opens this with its key.
export function ResetPasswordForm({ resetKey }: { resetKey: string }) {
  // Next passes the route param still percent-encoded
  const key = decodeURIComponent(resetKey);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("checking");
  const [errors, setErrors] = useState<AllauthError[]>([]);

  useEffect(() => {
    let active = true;
    keyIsValid(key)
      .then((valid) => active && setStatus(valid ? "ready" : "expired"))
      // Can't check it now: show the form, and the POST will tell us.
      .catch(() => active && setStatus("ready"));
    return () => {
      active = false;
    };
  }, [key]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setStatus("sending");
    setErrors([]);
    try {
      const result = await allauthPost("/auth/password/reset", {
        key,
        password,
      });
      // 401 = saved, and this browser still needs to sign in (200 if it signed in too)
      if (result.status === 200 || result.status === 401) {
        setStatus("done");
        return;
      }
      if (result.errors.some((e) => e.param === "key")) {
        setStatus("expired");
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
    setStatus("ready");
  }

  if (status === "checking") {
    return <p className="text-center text-muted">Checking your link…</p>;
  }

  if (status === "done") {
    return (
      <section className="flex flex-col items-center gap-3 text-center">
        <StatusIcon name="check" />
        <h1 className="font-display text-2xl font-extrabold">
          Your password is set
        </h1>
        <p role="status" className="text-muted">
          Sign in with your email and new password.
        </p>
        <Link href="/login" className={`${buttonClasses("cta")} w-full`}>
          Sign in
        </Link>
      </section>
    );
  }

  if (status === "expired") {
    return (
      <section className="flex flex-col items-center gap-3 text-center">
        <StatusIcon name="warning" />
        <h1 className="font-display text-2xl font-extrabold">
          This link has expired
        </h1>
        <p role="alert" className="text-muted">
          Reset links work once and only for a short time. Ask for a new one.
        </p>
        <Link
          href="/reset-password"
          className={`${buttonClasses("cta")} w-full`}
        >
          Send a new link
        </Link>
        <Link href="/login" className={buttonClasses("ghost", "sm")}>
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold">
          Set a new password
        </h1>
        <p className="text-sm text-muted">
          After this, you can sign in with your email and this password.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          New password
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
          8 or more characters. Not all numbers, and not close to your email.
        </p>
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
        {status === "sending" ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
