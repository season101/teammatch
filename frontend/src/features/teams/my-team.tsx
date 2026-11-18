"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Avatar } from "@/features/profiles/avatar";
import { useMySummary } from "@/features/shell/queries";
import { useMyTeam, type MyTeam } from "./queries";

// "2026-12-12" -> "Dec 12". Parsed as a local date so it doesn't slip a day.
export function termEnd(team: MyTeam) {
  return new Date(`${team.term.end_date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function MyTeamView() {
  const team = useMyTeam();
  // Cached by the shell, which loads it for the nav badges.
  const summary = useMySummary().data;

  if (team.isPending) {
    return <SkeletonRows label="Loading your team" />;
  }
  if (team.isError) {
    return (
      <EmptyState
        title="Couldn't load your team"
        action={<Button onClick={() => team.refetch()}>Try again</Button>}
      >
        Check your connection and try again.
      </EmptyState>
    );
  }
  if (!team.data) {
    // The nearest step to a team: an offer to answer, applicants to review, else the deck.
    const [href, label] = summary?.offers
      ? ["/applications", summary.offers === 1 ? "See your offer" : "See your offers"]
      : summary?.applicants_waiting
        ? ["/applicants", "Review applicants"]
        : ["/feed", "Go to Discover"];
    return (
      <EmptyState
        title="No team yet"
        action={
          <Link href={href} className={buttonClasses()}>
            {label}
          </Link>
        }
      >
        Your team shows up here once every role is filled. Team chat opens then.
      </EmptyState>
    );
  }
  return (
    <section aria-labelledby="my-team" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          Locked · {team.data.term.name}
        </p>
        <h2 id="my-team" className="font-display text-3xl font-extrabold">
          {team.data.project.title}
        </h2>
        <p className="text-muted">You&apos;re a team until {termEnd(team.data)}.</p>
      </div>
      <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Lineup</h3>
      <ul className="flex flex-col gap-2">
        {team.data.members.map((member, index) => (
          <li
            key={index}
            className="flex items-center gap-3 rounded-row border border-border bg-surface p-3"
          >
            <Avatar
              name={member.display_name}
              url={member.avatar_url}
              className="size-11 bg-surface-2"
            />
            <div>
              <p className="font-semibold">{member.display_name || "Unnamed member"}</p>
              <p className="text-sm text-muted">{member.role}</p>
            </div>
          </li>
        ))}
      </ul>
      {team.data.moderators.length > 0 && (
        <p className="text-sm text-muted">
          Moderated by {team.data.moderators.map((name) => name || "a moderator").join(", ")}
        </p>
      )}
      <Link
        href={`/teams/${team.data.id}/chat`}
        className={`${buttonClasses()} w-full sm:w-auto sm:self-start`}
      >
        Open team chat
      </Link>
    </section>
  );
}
