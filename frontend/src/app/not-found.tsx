"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/features/accounts/require-sign-in";

// Any unknown address. One way back: Discover when signed in, else the landing page.
export default function NotFound() {
  const { data: user } = useSession();
  return (
    <main className="flex flex-1 flex-col">
      <EmptyState
        title="We couldn't find that page"
        action={
          <Link href={user ? "/feed" : "/"} className={buttonClasses()}>
            Back to TeamMatch
          </Link>
        }
      >
        The link may be old, or the page may have moved.
      </EmptyState>
    </main>
  );
}
