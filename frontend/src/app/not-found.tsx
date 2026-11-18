"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/features/accounts/require-sign-in";

// Any unknown address. One way back: Discover when signed in, else the landing page.
// The link waits for the session check, so a quick click can't take a signed-in student
// to the landing page.
export default function NotFound() {
  const { data: user, isPending } = useSession();
  return (
    <main className="flex flex-1 flex-col">
      <EmptyState
        heading="h1"
        title="We couldn't find that page"
        action={
          !isPending && (
            <Link href={user ? "/feed" : "/"} className={buttonClasses()}>
              Back to TeamMatch
            </Link>
          )
        }
      >
        The link may be old, or the page may have moved.
      </EmptyState>
    </main>
  );
}
