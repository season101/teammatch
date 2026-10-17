"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { allauthPost } from "./allauth";

// Only follow ?next= to a page on this site, never to another website.
export function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/profile";
}

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSending(true);
    setError("");
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
        // Same message for a wrong email or a wrong password (F1-02).
        setError("Email or password is incorrect.");
      }
    } catch {
      setError("Can't reach the server. Try again.");
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Sign in to TeamMatch</h1>

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
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
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
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {sending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
