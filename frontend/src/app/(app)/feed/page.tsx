"use client";

import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Feed } from "@/features/feed/feed";

export default function FeedPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">Open roles</h1>
              {/* Phone and tablet; the desktop sidebar lists applications instead. */}
              <Link
                href="/applications"
                className={`${buttonClasses("secondary", "sm")} lg:hidden`}
              >
                My applications
              </Link>
            </div>
            <Feed />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
