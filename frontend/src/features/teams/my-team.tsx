"use client";

import { useMyTeam, type MyTeam } from "./queries";

export function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]);
  return letters.join("").toUpperCase() || "?";
}

// "2026-12-12" -> "Dec 12". Parsed as a local date so it doesn't slip a day.
export function termEnd(team: MyTeam) {
  return new Date(`${team.term.end_date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function MyTeamView() {
  const team = useMyTeam();

  if (team.isPending) {
    return <p className="text-muted">Loading your team…</p>;
  }
  if (team.isError) {
    return (
      <p role="alert" className="text-pass">
        Couldn&apos;t load your team. Refresh the page to try again.
      </p>
    );
  }
  if (!team.data) {
    return (
      <p className="text-muted">
        Your team shows up here once every role is filled. Team chat opens then.
      </p>
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
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 font-bold"
            >
              {initials(member.display_name)}
            </span>
            <div>
              <p className="font-semibold">{member.display_name || "Unnamed member"}</p>
              <p className="text-sm text-muted">{member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
