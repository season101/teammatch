"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getSessionUser, type SessionUser } from "./allauth";

export function useSession() {
  return useQuery({ queryKey: ["session"], queryFn: getSessionUser });
}

// Wrap a page with this to make it sign-in only. Signed-out visitors go to
// /login, and come back here after they sign in.
export function RequireSignIn({
  children,
}: {
  children: (user: SessionUser) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, user, pathname, router]);

  if (!user) {
    return <p className="text-sm text-muted">Checking your sign-in…</p>;
  }
  return <>{children(user)}</>;
}
