"use client";

import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Feed, FeedTitle } from "@/features/feed/feed";
import { CoachMarks } from "@/features/onboarding/coach-marks";

export default function FeedPage() {
  return (
    // Clips a dragged or flying card at the stage edge rather than the column edge.
    <div className="flex w-full flex-col overflow-x-clip">
      {/* Tight on phones, so Pass and Apply sit just above the tab bar (RoleCard's height).
          The card is 420px at most on tablet and 380px on desktop (layout.md). */}
      <main className="mx-auto flex w-full flex-col gap-6 px-4 py-4 sm:max-w-[28rem] sm:py-12 lg:max-w-[25.75rem]">
        <RequireSignIn>
          {() => (
            <>
              <div className="flex items-center justify-between gap-4">
                <FeedTitle />
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
