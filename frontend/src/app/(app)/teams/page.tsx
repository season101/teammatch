"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";

export default function TeamsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Teams</h1>
            <p className="text-muted">
              Your team shows up here once every role is filled. Team chat opens then.
            </p>
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
