"use client";

import { useParams } from "next/navigation";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { ResumeViewer } from "@/features/profiles/resume-viewer";

// Full screen, outside the app shell, as on screen 53: the viewer has its own bars.
export default function ResumePage() {
  const params = useParams<{ id: string }>();
  const profileId = Number(params.id);

  return (
    <main className="flex flex-1 flex-col">
      <RequireSignIn>
        {() =>
          Number.isInteger(profileId) ? (
            <ResumeViewer profileId={profileId} />
          ) : (
            <p role="alert" className="p-4">
              That resume address isn&apos;t valid.
            </p>
          )
        }
      </RequireSignIn>
    </main>
  );
}
