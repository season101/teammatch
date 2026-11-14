"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  continueWith,
  getSignInMethods,
  setPassword,
  type AllauthError,
} from "./allauth";
import { buttonClasses } from "@/components/ui/button";

const sectionHeading =
  "text-xs font-semibold tracking-wider text-muted uppercase";
const card = "rounded-row border border-border bg-surface p-4";

// Why a Connect came back refused (screen 46). Google sends ?error=<code> to /settings.
function connectErrorText(code: string, email: string) {
  if (code === "google_email_mismatch")
    return `That Google account uses a different email. Use the one for ${email}.`;
  if (code === "connected_other")
    return "That Google account is already on another TeamMatch account.";
  if (code === "google_account_not_allowed")
    return "Use your @email.latech.edu Google account.";
  if (code === "cancelled") return "Connecting Google was cancelled.";
  return "Couldn't connect Google. Try again.";
}

// Google sign-in is for students: @latech.edu staff aren't on Google (account-paths.md).
const canUseGoogle = (email: string) =>
  email.toLowerCase().endsWith("@email.latech.edu");

function SetPasswordForm({
  email,
  onSaved,
}: {
  email: string;
  onSaved: () => void;
}) {
  const [password, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<AllauthError[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSending(true);
    setErrors([]);
    try {
      const result = await setPassword(password);
      if (result.status === 200) {
        onSaved();
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
    setSending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="set-password-heading"
      className={`${card} flex flex-col gap-3`}
    >
      <div className="flex flex-col gap-0.5">
        <h3 id="set-password-heading" className="font-semibold">
          Set a password
        </h3>
        <p className="text-sm text-muted">
          Sign in with {email} and this password. Google keeps working.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby="new-password-hint"
          className="rounded-input border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        />
        <p id="new-password-hint" className="text-xs text-muted">
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
        disabled={sending}
        className={`${buttonClasses("cta")} w-full`}
      >
        {sending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}

// Settings → Ways to sign in (F1-12, screens 42 to 46).
export function SignInMethods() {
  const queryClient = useQueryClient();
  const methods = useQuery({
    queryKey: ["sign-in-methods"],
    queryFn: getSignInMethods,
  });
  const [settingPassword, setSettingPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Coming back from a refused Connect: Google sends ?error=<code> (screen 46).
  // It's only shown once the methods load, so the first render matches the server's.
  const [error] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URL(window.location.href).searchParams.get("error"),
  );

  // Then drop it from the address, so a refresh doesn't show it again.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;
    url.searchParams.delete("error");
    url.searchParams.delete("error_process");
    window.history.replaceState(null, "", url);
  }, []);

  if (methods.isPending)
    return <p className="text-sm text-muted">Loading your sign-in methods…</p>;
  if (methods.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        Couldn&apos;t load your sign-in methods. Refresh to try again.
      </p>
    );
  const { email, password, google, googleAvailable } = methods.data;

  const passwordRow = password ? (
    <div className={`${card} flex items-center justify-between gap-4`}>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Email and password</span>
        <span className="text-sm text-muted">{email}</span>
      </span>
      <span className="text-sm font-semibold text-muted">On</span>
    </div>
  ) : settingPassword ? (
    <SetPasswordForm
      email={email}
      onSaved={() => {
        setSettingPassword(false);
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ["sign-in-methods"] });
      }}
    />
  ) : (
    <div className={`${card} flex items-center justify-between gap-4`}>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Email and password</span>
        <span className="text-sm text-muted">Not set up</span>
      </span>
      <button
        type="button"
        onClick={() => setSettingPassword(true)}
        className={buttonClasses("secondary", "sm")}
      >
        Set a password
      </button>
    </div>
  );

  const googleRow = !googleAvailable ? null : google ? (
    <div className={`${card} flex items-center justify-between gap-4`}>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Google</span>
        <span className="text-sm text-muted">{email}</span>
      </span>
      <span className="text-sm font-semibold text-muted">Connected</span>
    </div>
  ) : canUseGoogle(email) ? (
    <div className={`${card} flex items-center justify-between gap-4`}>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Google</span>
        <span className="text-sm text-muted">Not connected</span>
      </span>
      <button
        type="button"
        disabled={connecting}
        onClick={() => {
          setConnecting(true);
          continueWith("google", undefined, "connect").catch(() =>
            setConnecting(false),
          );
        }}
        className={buttonClasses("secondary", "sm")}
      >
        {connecting ? "Opening Google…" : "Connect"}
      </button>
    </div>
  ) : null;

  return (
    <section
      id="sign-in"
      aria-labelledby="sign-in-heading"
      className="flex flex-col gap-2"
    >
      <h2 id="sign-in-heading" className={sectionHeading}>
        Ways to sign in
      </h2>
      {error && (
        <p
          role="alert"
          className="rounded-row border border-danger bg-surface p-4 text-sm text-text"
        >
          {connectErrorText(error, email)}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted">
          Password saved. You can sign in with {email} and it, or with Google.
        </p>
      )}
      {/* The way you already use comes first (screens 42 and 43). */}
      {password ? (
        <>
          {passwordRow}
          {googleRow}
        </>
      ) : (
        <>
          {googleRow}
          {passwordRow}
        </>
      )}
    </section>
  );
}
