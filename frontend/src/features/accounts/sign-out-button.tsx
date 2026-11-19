"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "./allauth";
import { buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PendingLabel } from "@/components/ui/pending-label";

// Settings → Sign out (UI-04). It asks first, then ends the session and goes to the landing page.
export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logOut() {
    setAsking(false);
    setSending(true);
    setFailed(false);
    try {
      await signOut();
    } catch {
      // Couldn't reach the server: let them try again.
      setSending(false);
      setFailed(true);
      return;
    }
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
        <PendingLabel pending={sending} label="Signing out">Sign out</PendingLabel>
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-pass">
          Couldn&apos;t sign out. Check your connection and try again.
        </p>
      )}
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="Sign out of TeamMatch?"
        ctaLabel="Sign out"
        onCta={logOut}
        escapeLabel="Cancel"
        escapeVariant="ghost"
      >
        You can sign back in with the same email.
      </Modal>
    </>
  );
}
