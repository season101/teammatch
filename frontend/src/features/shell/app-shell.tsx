"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useBump } from "@/components/ui/bump";
import { useSession } from "@/features/accounts/require-sign-in";
import { SignOutButton } from "@/features/accounts/sign-out-button";
import { ApplicationsPanel } from "@/features/applications/my-applications";
import { MyProjectsList } from "@/features/projects/my-projects-list";
import { Logo } from "@/features/landing/logo";
import { FinishSetup } from "@/features/onboarding/finish-setup";
import { useMyProjects, type MyProject } from "@/features/review/queries";
import { TeamCelebration } from "@/features/teams/its-a-team";
import { useMyTeam, type MyTeam } from "@/features/teams/queries";
import {
  DeckIcon,
  FolderIcon,
  PersonIcon,
  ReviewIcon,
  SettingsIcon,
  TeamIcon,
} from "./icons";
import { DECK_KEYS, KeyboardLegend, REVIEW_KEYS } from "./keyboard-legend";
import { useMySummary } from "./queries";

type Counts = { offers: number; applicants_waiting: number };

type NavItem = {
  href: string;
  label: string;
  icon: () => ReactNode;
  paths: string[];
  // Which count shows as a badge, and the words a screen reader hears after it.
  badge?: { count: keyof Counts; label: string };
  ownerOnly?: boolean;
};

// The four places everyone goes. Review is only for students who own a project.
const PLACES: NavItem[] = [
  {
    href: "/feed",
    label: "Discover",
    icon: DeckIcon,
    paths: ["/feed", "/applications"],
    badge: { count: "offers", label: "offers" },
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderIcon,
    paths: ["/projects"],
  },
  {
    href: "/applicants",
    label: "Review",
    icon: ReviewIcon,
    paths: ["/applicants"],
    badge: { count: "applicants_waiting", label: "applicants waiting" },
    ownerOnly: true,
  },
  { href: "/teams", label: "Teams", icon: TeamIcon, paths: ["/teams"] },
];

// Phone and tablet tabs: Me holds Profile and Settings.
const TABS: NavItem[] = [
  ...PLACES,
  {
    href: "/settings",
    label: "Me",
    icon: PersonIcon,
    paths: ["/settings", "/profile"],
  },
];

// Desktop nav column: the same places, with Profile and Settings as their own rows (DD-46).
const ACCOUNT: NavItem[] = [
  { href: "/profile", label: "Profile", icon: PersonIcon, paths: ["/profile"] },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    paths: ["/settings"],
  },
];

const LEGENDS: Record<string, typeof DECK_KEYS> = {
  "/feed": DECK_KEYS,
  "/applicants": REVIEW_KEYS,
};

function isIn(pathname: string, paths: string[]) {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// A count on a nav item. Nothing when it's zero or not loaded yet.
function Badge({ item, counts }: { item: NavItem; counts?: Counts }) {
  const count = item.badge ? counts?.[item.badge.count] : undefined;
  const bump = useBump(count);
  if (!count) return null;
  return (
    <span
      key={bump.key}
      className={`grid h-5 min-w-5 place-items-center rounded-pill bg-cta px-1.5 text-xs font-bold text-on-cta ${bump.className}`}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">
        , {count} {item.badge!.label}
      </span>
    </span>
  );
}

// Arrow keys, Home and End move focus along a row or column of links, like the Tabs component.
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const links = [...event.currentTarget.querySelectorAll<HTMLElement>("a")];
  const index = links.indexOf(document.activeElement as HTMLElement);
  const last = links.length - 1;
  const next = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowDown: index === last ? 0 : index + 1,
    ArrowLeft: index <= 0 ? last : index - 1,
    ArrowUp: index <= 0 ? last : index - 1,
    Home: 0,
    End: last,
  }[event.key];
  if (index === -1 || next === undefined) return;
  event.preventDefault();
  links[next].focus();
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const projects = useMyProjects(Boolean(user));
  const owned =
    projects.data?.filter((project) => project.status !== "archived") ?? [];
  const shown = (item: NavItem) => !item.ownerOnly || owned.length > 0;
  const tabs = TABS.filter(shown);
  const counts = useMySummary(Boolean(user)).data;
  const team = useMyTeam(Boolean(user)).data;
  const legend = LEGENDS[pathname];

  const navRow = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isIn(pathname, item.paths) ? "page" : undefined}
        className="group flex min-h-11 items-center gap-3 rounded-row px-3 text-sm font-medium text-muted transition-colors duration-fast hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold aria-[current=page]:text-text"
      >
        <span className="group-aria-[current=page]:text-primary">
          <Icon />
        </span>
        <span className="flex-1">{item.label}</span>
        <Badge item={item} counts={counts} />
      </Link>
    );
  };

  return (
    <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0 lg:flex-row">
      <header className="sticky top-[env(safe-area-inset-top)] z-10 hidden items-center gap-6 border-b border-border bg-surface px-6 sm:flex lg:hidden">
        <Logo className="text-lg" />
        <nav aria-label="Main" onKeyDown={moveFocus} className="flex">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isIn(pathname, tab.paths) ? "page" : undefined}
              className="relative flex min-h-14 items-center gap-1.5 px-3 text-sm font-semibold text-muted transition-colors duration-fast after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-pill after:bg-primary hover:text-text aria-[current=page]:text-text aria-[current=page]:after:scale-x-100"
            >
              {tab.label}
              <Badge item={tab} counts={counts} />
            </Link>
          ))}
        </nav>
      </header>

      <aside className="hidden border-r border-border bg-surface lg:sticky lg:top-[env(safe-area-inset-top)] lg:flex lg:h-[calc(100dvh-env(safe-area-inset-top))] lg:shrink-0">
        <div className="flex w-52 shrink-0 flex-col gap-1 border-r border-border p-3">
          <Link
            href="/feed"
            aria-label="TeamMatch, go to Discover"
            className="flex min-h-11 items-center px-3 pb-2"
          >
            <Logo className="text-lg" />
          </Link>
          <nav
            aria-label="Main"
            onKeyDown={moveFocus}
            className="flex flex-col gap-1"
          >
            {PLACES.filter(shown).map(navRow)}
            <span aria-hidden="true" className="mx-3 my-1 h-px bg-border" />
            {ACCOUNT.map(navRow)}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <FinishSetup />
            <p className="truncate px-3 text-xs text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="flex w-80 shrink-0 flex-col overflow-y-auto pt-3">
          <SidebarMode pathname={pathname} owned={owned} team={team} />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {children}
        {legend && <KeyboardLegend key={pathname} keys={legend} />}
      </div>

      {user && <TeamCelebration />}

      <nav
        aria-label="Main"
        onKeyDown={moveFocus}
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isIn(pathname, tab.paths) ? "page" : undefined}
              className="group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted aria-[current=page]:font-semibold aria-[current=page]:text-text"
            >
              <span className="group-aria-[current=page]:text-primary">
                <Icon />
              </span>
              {tab.label}
              {/* After the label so it reads "Discover, 2 offers"; drawn at the icon's corner. */}
              <span className="absolute top-1 left-1/2 ml-1.5">
                <Badge item={tab} counts={counts} />
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const rowLink =
  "flex min-h-11 items-center justify-between gap-2 rounded-row px-3 hover:bg-surface-2";

// What the sidebar lists in each mode. Team chat rows arrive with F4-08.
function SidebarMode({
  pathname,
  owned,
  team,
}: {
  pathname: string;
  owned: MyProject[];
  team?: MyTeam | null;
}) {
  if (isIn(pathname, ["/settings", "/profile"])) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <h2 className="px-3 text-lg font-bold">Settings</h2>
        <Link
          href="/settings#appearance"
          className={`${rowLink} font-semibold`}
        >
          Appearance
        </Link>
        <Link href="/settings#keyboard" className={`${rowLink} font-semibold`}>
          Keyboard shortcuts
        </Link>
        <div className="px-3 pt-2">
          <SignOutButton />
        </div>
      </div>
    );
  }

  if (isIn(pathname, ["/projects", "/applicants"])) {
    return (
      <div className="px-4">
        <Tabs
          label="Projects"
          defaultTab={pathname === "/applicants" ? "mine" : "browse"}
          tabs={[
            {
              id: "browse",
              label: "Browse",
              panel: (
                <Link href="/projects" className={rowLink}>
                  Open projects this term
                </Link>
              ),
            },
            {
              id: "mine",
              label: "Mine",
              panel: (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/projects/new"
                    className={buttonClasses("secondary", "sm")}
                  >
                    New project
                  </Link>
                  {/* BR-14 blocks publishing a second open project, not drafting one. */}
                  {owned.some((project) => project.status === "open") && (
                    <p className="px-3 text-xs text-muted">
                      You have an open project, so a new one stays a draft until
                      you close it or it locks.
                    </p>
                  )}
                  <MyProjectsList projects={owned} />
                  {owned.length > 0 && (
                    <Link href="/applicants" className={rowLink}>
                      Review applicants
                    </Link>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="px-4">
      <Tabs
        label="Your activity"
        defaultTab={pathname === "/teams" ? "teams" : "applications"}
        tabs={[
          {
            id: "applications",
            label: "Applications",
            panel: <ApplicationsPanel />,
          },
          {
            id: "teams",
            label: "Teams",
            panel: team ? (
              <Link
                href="/teams"
                aria-current={pathname === "/teams" ? "page" : undefined}
                className={`${rowLink} font-semibold aria-[current=page]:bg-surface-2`}
              >
                {team.project.title}
              </Link>
            ) : (
              <p className="px-3 text-sm text-muted">
                Your team shows up here once every role is filled.
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
