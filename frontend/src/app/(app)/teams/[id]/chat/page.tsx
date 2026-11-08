"use client";

import { useParams } from "next/navigation";
import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { TeamChat } from "@/features/chat/team-chat";

export default function TeamChatPage() {
  const params = useParams<{ id: string }>();

  return (
    // Fills the screen between the app's top and bottom bars, so only the messages scroll.
    <main className="mx-auto flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] w-full max-w-2xl flex-col sm:h-[calc(100dvh-3.5rem-1px)] lg:h-dvh">
      <RequireSignIn>
        {(user) => <TeamChat teamId={Number(params.id)} userId={user.id} />}
      </RequireSignIn>
    </main>
  );
}
