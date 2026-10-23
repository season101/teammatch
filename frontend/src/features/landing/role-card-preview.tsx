import { ActionButton } from "@/components/ui/action-button";
import { Chip } from "@/components/ui/chip";
import { MatchBadge } from "@/components/ui/match-badge";
import { TeamStrip } from "@/components/ui/team-strip";

// shortcut: a static picture of the role card (docs/design/components/role-card.md);
// swap in the real RoleCard once it is built.
const label =
  "text-xs font-semibold uppercase tracking-wide text-muted";

export function RoleCardPreview() {
  return (
    <div
      role="img"
      aria-label="Example role card: Frontend developer on Ruston Rec League, 100% match, 0 of 2 roles filled"
      inert
      className="relative mx-auto w-full max-w-80 lg:w-95 lg:max-w-none"
    >
      {/* The next card in the deck, peeking out behind; no x shift on phone, so 320 px never scrolls sideways. */}
      <div className="absolute inset-0 translate-y-3 rotate-3 lg:translate-x-3 rounded-card border border-border bg-surface shadow-card" />
      <div className="relative flex -rotate-2 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card lg:aspect-[3/4.6]">
        <div className="flex flex-col gap-10 bg-linear-to-br from-cover-indigo to-[color-mix(in_oklab,var(--color-cover-indigo)_62%,black)] p-5 lg:h-[42%] lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <TeamStrip segments={["current", "open"]} />
            </div>
            <MatchBadge percent={100} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/85">
              Ruston Rec League
            </p>
            <p className="font-display text-[28px] font-extrabold text-balance text-white md:text-3xl">
              Frontend developer
            </p>
          </div>
        </div>
        <div className="hidden flex-1 flex-col gap-3 p-5 lg:flex">
          <p className="text-sm text-muted">0 of 2 roles filled · Fall 2026</p>
          <p className={label}>Why you fit · 2 of 2 skills</p>
          <div className="flex flex-wrap gap-2">
            <Chip variant="matched">React</Chip>
            <Chip variant="matched">TypeScript</Chip>
          </div>
          <p className={label}>Team so far</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 items-center rounded-pill border border-dashed border-text px-2.5 text-sm font-medium">
              + you?
            </span>
            <span className="size-7 rounded-full border border-dashed border-muted" />
          </div>
          <p className="truncate text-sm text-muted">
            Schedule intramural games, track scores and message teams when a
            game moves.
          </p>
          <div className="mt-auto flex gap-4 text-sm">
            <span className="border-b-2 border-primary font-medium">Role</span>
            <span className="text-muted">Project</span>
            <span className="text-muted">Team</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <ActionButton kind="undo" />
            <ActionButton kind="pass" />
            <ActionButton kind="details" />
            <ActionButton kind="apply" />
          </div>
        </div>
      </div>
    </div>
  );
}
