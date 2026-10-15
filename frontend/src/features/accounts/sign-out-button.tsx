"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "./allauth";

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    await signOut();
    // Forget the cached user so protected pages see "signed out" right away.
    queryClient.setQueryData(["session"], null);
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending}
      className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {sending ? "Signing out…" : "Sign out"}
    </button>
  );
}
