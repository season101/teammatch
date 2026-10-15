"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { SignOutButton } from "@/features/accounts/sign-out-button";

// Sign-in only. The profile form (F1-03) and skill picker (F1-04) go here next.
export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-12">
      <RequireSignIn>
        {(user) => (
          <>
            <h1 className="text-2xl font-bold">My profile</h1>
            <p>
              Signed in as <strong>{user.email}</strong>
            </p>
            <div>
              <SignOutButton />
            </div>
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
