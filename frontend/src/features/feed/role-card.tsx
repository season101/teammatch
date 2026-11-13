import Link from "next/link";
import { MatchBadge } from "@/components/ui/match-badge";
import type { FeedRole } from "./queries";

// The rest go behind "+N more" so the chips stay on one row.
const SKILLS_SHOWN = 3;

// Until F3-13 adds the role details page, this is the project page as it is.
export const roleHref = (role: FeedRole) => `/projects/${role.project.id}?role=${role.id}`;

// The card fills the phone between the header and the action buttons. The loading
// skeleton takes the same height, so nothing moves when the first role arrives.
export const deckCardHeight =
  "h-[clamp(22rem,calc(100svh-14.25rem-var(--deck-banner,0rem)-env(safe-area-inset-top)-env(safe-area-inset-bottom)),38rem)] sm:h-[clamp(22rem,calc(100svh-18.5rem-var(--deck-banner,0rem)-env(safe-area-inset-top)),38rem)]";

export function RoleCard({ role, mySkillIds }: { role: FeedRole; mySkillIds: number[] }) {
  const headingId = `role-${role.id}`;
  const more = role.required_skills.length - SKILLS_SHOWN;

  return (
    <article
      aria-labelledby={headingId}
      // Same height on every card, so Pass and Apply never move. The viewport minus the
      // page header, padding, buttons and phone tab bar puts them just above the tab bar.
      // --deck-banner is the offers banner's height when the deck shows one.
      className={`flex flex-col gap-3 overflow-hidden rounded-card border border-border bg-surface p-5 ${deckCardHeight}`}
    >
      <header>
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="truncate text-lg font-semibold">
            {role.title}
          </h2>
          {/* Null when the role asks for no skills, so there's nothing to match (DD-20). */}
          {role.match_percent !== null && (
            <span className="shrink-0">
              <MatchBadge percent={role.match_percent} />
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted">
          {role.project.title} · by {role.project.owner_name || "a classmate"}
        </p>
      </header>

      {role.required_skills.length > 0 && (
        <ul aria-label="Required skills" className="flex gap-2">
          {role.required_skills.map((skill, index) => {
            const mine = mySkillIds.includes(skill.id);
            // Screen readers still get every skill.
            const shown = index < SKILLS_SHOWN ? "min-w-0 truncate" : "sr-only";
            return (
              <li
                key={skill.id}
                className={`${shown} ${
                  mine
                    ? "rounded-pill border border-success bg-surface-2 px-3 py-1 text-sm font-medium text-text"
                    : "rounded-pill border border-border px-3 py-1 text-sm text-text"
                }`}
              >
                {mine && <span aria-hidden="true">✓ </span>}
                {skill.name}
                {mine && <span className="sr-only"> (you have this skill)</span>}
              </li>
            );
          })}
          {more > 0 && (
            <li
              aria-hidden="true"
              className="shrink-0 rounded-pill border border-border px-3 py-1 text-sm text-muted"
            >
              +{more} more
            </li>
          )}
        </ul>
      )}

      <p className="line-clamp-5 text-text">{role.project.pitch}</p>

      {/* How close the team is to locking (principle 2), and the term (DD-21). */}
      <div className="mt-auto flex flex-col gap-1.5">
        <div aria-hidden="true" className="flex gap-1">
          {Array.from({ length: role.roles_total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-pill ${i < role.roles_filled ? "bg-apply-text" : "bg-surface-2"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          {role.roles_filled} of {role.roles_total} roles filled · {role.term}
        </p>
      </div>

      <Link
        href={roleHref(role)}
        aria-label={`View details for ${role.title}`}
        className="flex min-h-11 items-center gap-3 rounded-row border border-border px-3 py-2 hover:bg-surface-2"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold"
        >
          i
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold">View details</span>
          <span className="text-xs text-muted">Role, project and team</span>
        </span>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </Link>
    </article>
  );
}
