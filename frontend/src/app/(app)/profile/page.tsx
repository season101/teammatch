"use client";

import Link from "next/link";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ProfileTabs } from "@/features/profiles/profile-tabs";

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <RequireSignIn>
        {(user) => (
          <>
            {/* Opened from Settings (the Me tab) on phones and tablets. */}
            <Link href="/settings" className="-mb-3 flex min-h-11 items-center gap-1 self-start text-sm font-medium text-muted hover:text-text lg:hidden">
              <span aria-hidden="true">‹</span>Settings
            </Link>
            <header className="flex flex-col gap-1">
              <h1 className="font-display text-3xl font-extrabold">My profile</h1>
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
