"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ProfileTabs } from "@/features/profiles/profile-tabs";

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {(user) => (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">My profile</h1>
              <p className="text-muted">
                Signed in as <strong>{user.email}</strong>. Only you see your
                email.
              </p>
            </header>
            <ProfileTabs />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
