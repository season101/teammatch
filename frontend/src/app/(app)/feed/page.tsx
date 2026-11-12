"use client";

import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Feed } from "@/features/feed/feed";
import { CoachMarks } from "@/features/onboarding/coach-marks";

export default function FeedPage() {
  return (
    // Clips a dragged or flying card at the stage edge rather than the column edge.
    <div className="flex w-full flex-col overflow-x-clip">
      {/* Tight on phones, so Pass and Apply sit just above the tab bar (RoleCard's height). */}
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-4 sm:py-12">
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
              <CoachMarks />
            </>
          )}
        </RequireSignIn>
      </main>
    </div>
  );
}
