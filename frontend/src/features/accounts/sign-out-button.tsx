"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "./allauth";
import { buttonClasses } from "@/components/ui/button";

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
      className={buttonClasses("secondary")}
    >
      {sending ? "Signing out…" : "Sign out"}
    </button>
  );
}
