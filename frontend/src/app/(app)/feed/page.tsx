"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { Feed } from "@/features/feed/feed";

export default function FeedPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Open roles</h1>
            <Feed />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
