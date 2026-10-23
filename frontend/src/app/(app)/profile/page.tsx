"use client";

import Link from "next/link";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ProfileForm } from "@/features/profiles/profile-form";

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {(user) => (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">My profile</h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Signed in as <strong>{user.email}</strong>. Only you see your
                email.
              </p>
            </header>
            <ProfileForm />
            <div className="flex items-center gap-4">
              <Link
                href="/feed"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Browse open roles
              </Link>
              <Link
                href="/applicants"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Review applicants
              </Link>
              <Link
                href="/settings"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Settings
              </Link>
            </div>
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
