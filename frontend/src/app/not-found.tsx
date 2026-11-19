"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { AuthLayout, StatusIcon } from "@/features/accounts/auth-layout";
import { useSession } from "@/features/accounts/require-sign-in";

// Any unknown address, in the same layout as the other message screens (expired link,
// check your inbox). One way back: Discover when signed in, else the landing page.
// The link waits for the session check, so a quick click can't take a signed-in student
// to the landing page.
export default function NotFound() {
  const { data: user, isPending } = useSession();
  return (
    <AuthLayout>
      <section className="flex flex-col items-center gap-3 text-center">
        <StatusIcon name="warning" />
        <h1 className="font-display text-2xl font-extrabold">We couldn&apos;t find that page</h1>
        <p className="text-muted">The link may be old, or the page may have moved.</p>
        {!isPending && (
          <Link href={user ? "/feed" : "/"} className={`${buttonClasses("cta")} w-full`}>
            Back to TeamMatch
          </Link>
        )}
      </section>
    </AuthLayout>
  );
}
