"use client";

import Link from "next/link";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { MyApplications } from "@/features/applications/my-applications";

export default function ApplicationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 sm:py-12 lg:max-w-5xl">
      <RequireSignIn>
        {() => (
          <>
            {/* Opened from Discover on phones and tablets, where it has no tab of its own. */}
            <Link href="/feed" className="-mb-3 flex min-h-11 items-center gap-1 self-start text-sm font-medium text-muted hover:text-text lg:hidden">
              <span aria-hidden="true">‹</span>Discover
            </Link>
            <h1 className="font-display text-3xl font-extrabold">My applications</h1>
            <MyApplications />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
