import Link from "next/link";
import { MatchBadge } from "@/components/ui/match-badge";
import type { FeedRole } from "./queries";

// The rest go behind "+N more" so the chips stay within two rows.
const SKILLS_SHOWN = 3;

// The role details page: the project page focused on one role (F3-13, DD-39).
export const roleHref = (role: FeedRole) => `/projects/${role.project.id}?role=${role.id}`;

// How the deck and the role details page hand off (F3-13). `opened` is the role the deck
// just opened, so the page's Back steps back to the deck in history and the cached feed
// shows the same card. Opened from a link or after a reload it's null, and Back goes to
// Discover. `returning` asks the deck to take focus once it's back, for the arrow keys.
export const deckHandoff = { opened: null as number | null, returning: false };
export const markOpenedFromDeck = (role: FeedRole) => {
  deckHandoff.opened = role.id;
};

// The card fills the phone between the header and the action buttons. The loading
// skeleton takes the same height, so nothing moves when the first role arrives.
export const deckCardHeight =
  "h-[clamp(22rem,calc(100svh-14.25rem-var(--deck-banner,0rem)-env(safe-area-inset-top)-env(safe-area-inset-bottom)),38rem)] sm:h-[clamp(22rem,calc(100svh-18.5rem-var(--deck-banner,0rem)-env(safe-area-inset-top)),38rem)]";

export function RoleCard({ role, mySkillIds }: { role: FeedRole; mySkillIds: number[] }) {
  const headingId = `role-${role.id}`;
  const more = role.required_skills.length - SKILLS_SHOWN;

  const required = role.required_skills;
  const have = required.filter((skill) => mySkillIds.includes(skill.id)).length;

  return (
    <article
      aria-labelledby={headingId}
      // Same height on every card, so Pass and Apply never move. The viewport minus the
      // page header, padding, buttons and phone tab bar puts them just above the tab bar.
      // --deck-banner is the banner's height (offers or add skills) when the deck shows one.
      className={`flex flex-col gap-3 overflow-hidden rounded-card border border-border bg-surface p-5 ${deckCardHeight}`}
    >
      <header className="flex flex-col gap-1.5">
        <div className="flex min-h-6 items-center justify-between gap-3 text-xs text-muted">
          {/* Null when the role asks for no skills, so there's nothing to match (DD-20).
              0% with no skills says nothing about the role, so prompt instead. */}
          {role.match_percent === null ? (
            <span />
          ) : role.match_percent === 0 && mySkillIds.length === 0 ? (
            <span>Add skills to see your match</span>
          ) : (
            <MatchBadge percent={role.match_percent} />
          )}
          {/* The term (DD-21). */}
          <span className="shrink-0">{role.term}</span>
        </div>
        {/* Two lines, never cut mid-word by the badge. */}
        <h2
          id={headingId}
          className="line-clamp-2 font-display text-[26px] leading-tight font-extrabold text-balance sm:text-[28px]"
        >
          {role.title}
        </h2>
        <p className="truncate text-sm text-muted">
          {role.project.title} · by {role.project.owner_name || "a classmate"}
        </p>
      </header>

      {required.length > 0 && (
        // Whole chips only: they wrap, and a third row is clipped rather than cut mid-word.
        <ul aria-label="Required skills" className="flex max-h-[4.25rem] shrink-0 flex-wrap gap-2 overflow-hidden">
          {required.map((skill, index) => {
            const mine = mySkillIds.includes(skill.id);
            // Screen readers still get every skill.
            const shown = index < SKILLS_SHOWN ? "max-w-full truncate" : "sr-only";
            return (
              <li
                key={skill.id}
                className={`${shown} ${
                  mine
                    ? // Lime, like the matched Chip on the role's details page (chip.md).
                      "rounded-pill border border-apply bg-apply px-3 py-1 text-sm font-medium text-on-apply"
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
              className="rounded-pill border border-border px-3 py-1 text-sm text-muted"
            >
              +{more} more
            </li>
          )}
        </ul>
      )}

      {/* Gives way first on a short screen, so the team and View details always show. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <p className="line-clamp-4 text-text">{role.project.pitch}</p>
      </div>

      {/* The body is never half empty (DD-08). Dropped on short screens. */}
      {required.length > 0 && mySkillIds.length > 0 && (
        <p className="hidden flex-col gap-0.5 rounded-row bg-surface-2 p-3 text-sm [@media(min-height:44rem)]:flex">
          <span className="font-semibold">Why you fit</span>
          <span className="text-muted">
            You have {have} of the {required.length} {required.length === 1 ? "skill" : "skills"} this
            role needs.
          </span>
        </p>
      )}

      {/* How close the team is to locking (principle 2). */}
      <div className="flex flex-col gap-2">
        <p className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">Team so far</span>
          <span className="text-xs text-muted">
            {role.roles_filled} of {role.roles_total} roles filled
          </span>
        </p>
        <div aria-hidden="true" className="flex gap-1">
          {Array.from({ length: role.roles_total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-pill ${i < role.roles_filled ? "bg-apply-text" : "bg-border-control/60"}`}
            />
          ))}
        </div>
      </div>

      <Link
        href={roleHref(role)}
        onClick={() => markOpenedFromDeck(role)}
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
