"use client";

import Link from "next/link";
import { useState } from "react";
import { allauthPost } from "./allauth";
import { StatusIcon } from "./auth-layout";
import { buttonClasses } from "@/components/ui/button";

type Status = "idle" | "sending" | "verified" | "failed";

// A button instead of verifying on page load, so link scanners in email apps
// can't use up the key before the student clicks it.
export function VerifyEmail({ verificationKey }: { verificationKey: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function verify() {
    setStatus("sending");
    try {
      // Next passes the route param still percent-encoded (":" arrives as "%3A")
      const result = await allauthPost("/auth/email/verify", {
        key: decodeURIComponent(verificationKey),
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
      <section className="flex flex-col items-center gap-3 text-center">
        <StatusIcon name="check" />
        <h1 className="font-display text-2xl font-extrabold">
          You&apos;re verified
        </h1>
        <p role="status" className="text-muted">
          Welcome! Set up your profile and you&apos;re ready to swipe.
        </p>
        <Link href="/profile" className={`${buttonClasses("cta")} w-full`}>
          Continue
        </Link>
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="flex flex-col items-center gap-3 text-center">
        <StatusIcon name="warning" />
        <h1 className="font-display text-2xl font-extrabold">
          This link has expired
        </h1>
        <p role="alert" className="text-muted">
          Verification links last 3 days, and each works once. Sign up again to
          get a new one.
        </p>
        <Link href="/signup" className={`${buttonClasses("cta")} w-full`}>
          Sign up again
        </Link>
        <Link href="/login" className={buttonClasses("ghost", "sm")}>
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center gap-3 text-center">
      <StatusIcon name="mail" />
      <h1 className="font-display text-2xl font-extrabold">
        Verify your email
      </h1>
      <p className="text-muted">One click to confirm this address is yours.</p>
      <button
        type="button"
        onClick={verify}
        disabled={status === "sending"}
        className={`${buttonClasses("cta")} w-full`}
      >
        {status === "sending" ? "Verifying…" : "Verify my email"}
      </button>
    </section>
  );
}
