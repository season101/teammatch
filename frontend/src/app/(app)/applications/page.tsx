"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { MyApplications } from "@/features/applications/my-applications";

export default function ApplicationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">My applications</h1>
            <MyApplications />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
