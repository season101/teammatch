"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Moderation } from "@/features/moderation/moderation";

export default function ModerationPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
            <Moderation />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
