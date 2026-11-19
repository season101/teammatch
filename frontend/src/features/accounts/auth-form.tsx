"use client";

import { useState, type FormEvent } from "react";
import { GoogleButton, googleErrorText } from "./google-button";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";
import { buttonClasses } from "@/components/ui/button";
import { helperClass, inputClass } from "@/components/ui/form-classes";

type Step = "email" | "signin" | "signup";

// Sign in or sign up: one screen for both. Google, or the school email first and
// the password next. The server never says whether an email has an account
// (F1-02), so the password step opens on `start` and offers the other in place.
export function AuthForm({
  next,
  googleError,
  start = "signin",
}: {
  next?: string;
  // ?error= from a Google sign-in that didn't work (/auth/callback sends it here)
  googleError?: string;
  start?: "signin" | "signup";
}) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const go = (to: Step) => (current: string) => {
    setEmail(current);
    setStep(to);
  };

  if (step === "signin")
    return (
      <SignInForm next={next} initialEmail={email} onSwitch={go("signup")} />
    );
  if (step === "signup")
    return <SignUpForm initialEmail={email} onSwitch={go("signin")} />;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setStep(start);
  }

  return (
    <div className="flex flex-col gap-6">
      {googleError && (
        <p
          role="alert"
          className="rounded-card border border-pass bg-surface-2 p-3 text-sm text-text"
        >
          {googleErrorText(googleError)}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Sign in or sign up
        </h1>
        <p className="text-muted">
          {/* Sent here from a page that needs an account: say so. */}
          {next
            ? "Sign in to pick up where you were. Start with your school email."
            : "One step for both. Start with your school email."}
        </p>
      </div>
      <GoogleButton next={next} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            School email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.latech.edu"
            aria-describedby="email-hint"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <p id="email-hint" className={helperClass}>
            Use your @latech.edu or @email.latech.edu email.
          </p>
        </div>
        <button type="submit" className={buttonClasses("cta", "lg", true)}>
          Continue with email
        </button>
      </form>

      <p className="text-xs text-muted">
        New here? You&apos;ll agree to four team rules and pick your skills
        next. It takes about a minute.
      </p>
    </div>
  );
}
