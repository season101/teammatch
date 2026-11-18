"use client";

import { useState, type ReactNode } from "react";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MatchBadge } from "@/components/ui/match-badge";
import { Modal } from "@/components/ui/modal";
import { ProfileStrength } from "@/components/ui/profile-strength";
import { Tabs } from "@/components/ui/tabs";
import { TeamStrip } from "@/components/ui/team-strip";
import { Toast } from "@/components/ui/toast";

// The living reference for the tokens in globals.css and components/ui.

const colours = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["border", "border-border"],
  ["text", "text-text"],
  ["text-muted", "text-muted"],
  ["primary", "bg-primary"],
  ["on-primary", "text-on-primary"],
  ["apply", "bg-apply"],
  ["on-apply", "text-on-apply"],
  ["apply-text", "text-apply-text"],
  ["pass", "bg-pass / bg-danger"],
  ["on-danger", "text-on-danger"],
  ["info", "bg-info"],
  ["undo", "bg-undo / bg-warning"],
  ["success", "bg-success"],
  ["cta", "bg-cta"],
  ["on-cta", "text-on-cta"],
  ["scrim", "backdrop:bg-scrim"],
];

const typeScale = [
  ["text-xs", "text-xs"],
  ["text-sm", "text-sm"],
  ["text-base", "text-base"],
  ["text-lg", "text-lg"],
  ["text-xl", "text-xl"],
  ["text-2xl", "text-2xl"],
  ["text-3xl", "text-3xl font-display font-extrabold"],
  ["text-4xl", "text-4xl font-display font-extrabold"],
  ["text-5xl", "text-5xl font-display font-black"],
];

const radii = [
  ["rounded-chip", "rounded-chip", "Chips inside cards"],
  ["rounded-input", "rounded-input", "Inputs"],
  ["rounded-row", "rounded-row", "Rows, square buttons, toasts"],
  ["rounded-card", "rounded-card", "Cards"],
  ["rounded-sheet", "rounded-sheet", "Sheets, modals"],
  ["rounded-pill", "rounded-pill", "Pills"],
];

const durations = [
  ["duration-fast", "duration-fast"],
  ["duration-base", "duration-base"],
  ["duration-slow", "duration-slow"],
];

const spacing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];

const themes = ["system", "dark", "light"] as const;

const actions = [
  ["undo", "Z"],
  ["pass", "←"],
  ["details", "↑"],
  ["apply", "→"],
] as const;

// Approved project covers (brief §3). Content, not tokens.
const covers = [
  ["#C2275B", "raspberry"],
  ["#0B5E57", "pine"],
  ["#2058C9", "cobalt"],
  ["#3E2BB8", "indigo"],
  ["#7A2E58", "plum"],
  ["#9A3412", "rust"],
];

// Gradients run from the cover colour to a darker shade, never lighter.
function coverGradient(hex: string) {
  return `linear-gradient(160deg, ${hex}, color-mix(in oklab, ${hex}, black 35%))`;
}

// Example profile (decision D1): major, skills, bio and avatar.
const profileSections: [string, number, boolean][] = [
  ["Major", 20, true],
  ["Skills", 40, true],
  ["Bio", 20, false],
  ["Avatar", 20, false],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="font-display text-3xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<(typeof themes)[number]>("system");
  const [moved, setMoved] = useState(false);
  const [skills, setSkills] = useState(["Python", "React", "Figma"]);
  const [gateOpen, setGateOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [lastAction, setLastAction] = useState("none yet");

  return (
    <div
      data-theme={theme === "system" ? undefined : theme}
      className="flex-1 bg-bg text-text"
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-6">
          <p className="font-mono text-sm text-muted">
            TeamMatch design system
          </p>
          <h1 className="font-display text-hero font-black">
            Find your <em>team</em>.
          </h1>
          <div
            role="group"
            aria-label="Theme"
            className="flex flex-wrap items-center gap-2"
          >
            {themes.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={theme === t ? "cta" : "secondary"}
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
              >
                {t === "system" ? "System" : t === "dark" ? "Dark" : "Light"}
              </Button>
            ))}
          </div>
        </header>

        <Section title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {colours.map(([name, utility]) => (
              <li
                key={name}
                className="overflow-hidden rounded-row border border-border bg-surface"
              >
                <div
                  className="h-16 border-b border-border"
                  style={{ background: `var(--${name})` }}
                />
                <div className="p-3">
                  <p className="font-mono text-sm">--{name}</p>
                  <p className="text-xs text-muted">{utility}</p>
                </div>
              </li>
            ))}
            <li className="overflow-hidden rounded-row border border-border bg-surface">
              <div className="h-16 border-b border-border bg-spark" />
              <div className="p-3">
                <p className="font-mono text-sm">spark</p>
                <p className="text-xs text-muted">
                  bg-spark · logo and celebrations only
                </p>
              </div>
            </li>
          </ul>
        </Section>

        <Section title="Type">
          <p className="text-muted">
            Display is <span className="font-display">Fraunces</span>, UI is
            Geist, and numbers, keys and counts are{" "}
            <span className="font-mono">Geist Mono 86%</span>.
          </p>
          <ul className="flex flex-col gap-3">
            {typeScale.map(([name, className]) => (
              <li key={name} className="flex items-baseline gap-4">
                <span className="w-20 shrink-0 font-mono text-xs text-muted">
                  {name}
                </span>
                <span className={className}>Swipe on roles, not people.</span>
              </li>
            ))}
            <li className="flex items-baseline gap-4">
              <span className="w-20 shrink-0 font-mono text-xs text-muted">
                text-hero
              </span>
              <span className="font-display text-hero font-black italic">
                It’s a Team!
              </span>
            </li>
          </ul>
        </Section>

        <Section title="Shape and depth">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {radii.map(([name, className, use]) => (
              <li key={name} className="flex flex-col gap-2">
                <div
                  className={`h-20 border border-border bg-surface-2 ${className}`}
                />
                <p className="font-mono text-sm">{name}</p>
                <p className="text-xs text-muted">{use}</p>
              </li>
            ))}
          </ul>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="h-28 rounded-card bg-surface shadow-card" />
              <p className="font-mono text-sm">shadow-card</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-28 rounded-sheet bg-surface shadow-modal" />
              <p className="font-mono text-sm">shadow-modal</p>
            </div>
          </div>
        </Section>

        <Section title="Space">
          <ul className="flex flex-col gap-2">
            {spacing.map((step) => (
              <li key={step} className="flex items-center gap-4">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">
                  {step} · {step * 4}px
                </span>
                <span
                  className="h-3 rounded-chip bg-primary"
                  style={{ width: `calc(var(--spacing) * ${step})` }}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Motion">
          <p className="text-muted">
            All on <span className="font-mono">ease-standard</span>. With
            reduced motion on, nothing slides.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setMoved(!moved)}
          >
            Play
          </Button>
          <ul className="flex flex-col gap-3">
            {durations.map(([name, className]) => (
              <li key={name} className="flex items-center gap-4">
                <span className="w-28 shrink-0 font-mono text-xs text-muted">
                  {name}
                </span>
                <span className="relative h-6 flex-1 rounded-pill bg-surface-2">
                  <span
                    className={`absolute left-0 top-0 size-6 rounded-full bg-primary ease-standard motion-safe:transition-transform ${className} ${moved ? "translate-x-40" : ""}`}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="cta">Apply</Button>
            <Button variant="secondary">Edit profile</Button>
            <Button variant="ghost">Skip for now</Button>
            <Button variant="danger">Delete role</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Open team chat</Button>
          </div>
        </Section>

        <Section title="Chip">
          <p className="text-sm text-muted">Inside a card (6px radius)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="matched">Python</Chip>
            <Chip variant="matched">React</Chip>
            <Chip>SQL</Chip>
          </div>
          <p className="text-sm text-muted">In a picker (pill)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="selected" pill>
              Data &amp; ML
            </Chip>
            {skills.map((skill) => (
              <Chip
                key={skill}
                pill
                onRemove={() => setSkills(skills.filter((s) => s !== skill))}
              >
                {skill}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Action bar">
          <div className="flex items-center gap-4">
            {actions.map(([kind]) => (
              <ActionButton
                key={kind}
                kind={kind}
                onClick={() => setLastAction(kind)}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-4 text-sm text-muted">
            {actions.map(([kind, key]) => (
              <li key={kind} className="flex items-center gap-2">
                <kbd className="grid h-7 min-w-7 place-items-center rounded-chip border border-border bg-surface-2 px-1.5 text-text">
                  {key}
                </kbd>
                {kind}
              </li>
            ))}
          </ul>
          <p className="font-mono text-sm text-muted">
            Last pressed: {lastAction}
          </p>
        </Section>

        <Section title="Cover, team strip and match">
          <p className="text-sm text-muted">
            The team strip only sits on a project cover. Covers are content,
            the same in both themes.
          </p>
          <div
            className="flex aspect-[380/280] max-w-sm flex-col justify-between rounded-card p-4 text-white"
            style={{ background: coverGradient("#0B5E57") }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <TeamStrip
                  segments={["filled", "filled", "current", "open", "open"]}
                />
              </div>
              <MatchBadge percent={86} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/85">
                Campus Eats
              </p>
              <p className="font-display text-3xl font-extrabold">
                Frontend dev
              </p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-3">
            {covers.map(([hex, name]) => (
              <li key={hex} className="flex flex-col gap-1">
                <div
                  className="flex h-16 w-28 items-start rounded-row p-2"
                  style={{ background: coverGradient(hex) }}
                >
                  <div className="w-full">
                    <TeamStrip segments={["filled", "current", "open"]} />
                  </div>
                </div>
                <p className="font-mono text-xs text-muted">
                  {name} {hex}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Profile strength">
          <div className="flex max-w-sm flex-col gap-4">
            <ProfileStrength
              value={profileSections
                .filter(([, , done]) => done)
                .reduce((sum, [, weight]) => sum + weight, 0)}
            />
            <ul className="flex flex-col gap-1 text-sm">
              {profileSections.map(([name, weight, done]) => (
                <li key={name} className="flex justify-between">
                  <span className={done ? "text-text" : "text-muted"}>
                    {done ? "✓ " : ""}
                    {name}
                  </span>
                  <span className="font-mono text-muted">+{weight}%</span>
                </li>
              ))}
            </ul>
            <ProfileStrength value={100} />
          </div>
        </Section>

        <Section title="Tabs">
          <div className="max-w-sm rounded-card bg-surface">
            <Tabs
              label="Your activity"
              tabs={[
                {
                  id: "applications",
                  label: "Applications",
                  panel: (
                    <p className="px-4 text-muted">
                      3 pending · 1 filled · 2 passed
                    </p>
                  ),
                },
                {
                  id: "teams",
                  label: "Teams",
                  panel: <p className="px-4 text-muted">No teams yet.</p>,
                },
              ]}
            />
          </div>
        </Section>

        <Section title="Modal and toast">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setGateOpen(true)}>
              Withdraw application
            </Button>
            <Button variant="secondary" onClick={() => setToastOpen(true)}>
              Fill a role
            </Button>
          </div>
          <Toast title="Role filled">Frontend dev on Campus Eats.</Toast>
          <Modal
            open={gateOpen}
            onClose={() => setGateOpen(false)}
            title="Withdraw this application?"
            ctaLabel="Keep my application"
            onCta={() => setGateOpen(false)}
            escapeLabel="Withdraw"
          >
            The owner won’t see it any more. You can apply again later.
          </Modal>
          {toastOpen && (
            <div className="fixed inset-x-0 bottom-6 flex justify-center px-4">
              <Toast title="Role filled" onDismiss={() => setToastOpen(false)}>
                You’re the Designer on Study Buddy.
              </Toast>
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}
