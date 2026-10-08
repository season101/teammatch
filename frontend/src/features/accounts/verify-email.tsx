"use client";

import Link from "next/link";
import { useState } from "react";
import { allauthPost } from "./allauth";

type Status = "idle" | "sending" | "verified" | "failed";

// A button instead of verifying on page load, so link scanners in email apps
// can't use up the key before the student clicks it.
export function VerifyEmail({ verificationKey }: { verificationKey: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function verify() {
    setStatus("sending");
    try {
      const result = await allauthPost("/auth/email/verify", {
        key: verificationKey,
      });
      // 200 = verified and signed in; 401 = verified, but this browser still needs to sign in
      setStatus(
        result.status === 200 || result.status === 401 ? "verified" : "failed",
      );
    } catch {
      setStatus("failed");
    }
  }

  if (status === "verified") {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Email verified</h1>
        <p role="status">Your account is ready.</p>
        <Link href="/" className="font-medium text-indigo-600 underline">
          Continue to TeamMatch
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      {status === "failed" && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          This link is invalid or has expired. Sign up again to get a new one.
        </p>
      )}
      <button
        type="button"
        onClick={verify}
        disabled={status === "sending"}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === "sending" ? "Verifying…" : "Verify my email"}
      </button>
    </section>
  );
}
