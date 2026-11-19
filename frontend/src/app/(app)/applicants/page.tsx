"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ReviewApplicants } from "@/features/review/review-applicants";

export default function ApplicantsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="font-display text-3xl font-extrabold">Review applicants</h1>
            <ReviewApplicants />
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
