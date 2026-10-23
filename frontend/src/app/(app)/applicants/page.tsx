"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ReviewApplicants } from "@/features/review/review-applicants";

export default function ApplicantsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Review applicants</h1>
            <ReviewApplicants />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
