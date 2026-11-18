"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { useMyRole } from "@/features/profiles/queries";
import { ModeratedTeams } from "@/features/teams/moderated-teams";
import { MyTeamView } from "@/features/teams/my-team";

export default function TeamsPage() {
  const moderator = useMyRole() === "moderator";
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <title>Teams · TeamMatch</title>
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Teams</h1>
            {moderator ? <ModeratedTeams /> : <MyTeamView />}
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
