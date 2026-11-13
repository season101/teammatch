"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "./allauth";
import { buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PendingLabel } from "@/components/ui/pending-label";

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
    // Drop everything cached for this user, so the next person on this browser
    // doesn't see their profile or projects, and pages ask the server again.
    queryClient.clear();
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
        <PendingLabel pending={sending} label="Logging out">Log out</PendingLabel>
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
