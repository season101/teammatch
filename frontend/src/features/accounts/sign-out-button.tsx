"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "./allauth";
import { buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

// Settings → Log out (UI-04). It asks first, then ends the session and goes to the landing page.
export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);

  async function logOut() {
    setAsking(false);
    setSending(true);
    await signOut();
    // Forget the cached user so protected pages see "signed out" right away.
    queryClient.setQueryData(["session"], null);
    router.replace("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        disabled={sending}
        className={buttonClasses("secondary")}
      >
        {sending ? "Logging out…" : "Log out"}
      </button>
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="Log out of TeamMatch?"
        ctaLabel="Log out"
        onCta={logOut}
        escapeLabel="Cancel"
        escapeVariant="ghost"
      >
        You can sign back in with the same email.
      </Modal>
    </>
  );
}
