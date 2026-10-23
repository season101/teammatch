"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useSession } from "@/features/accounts/require-sign-in";
import { SignOutButton } from "@/features/accounts/sign-out-button";
import { Logo } from "@/features/landing/logo";
import { useMyProjects, type MyProject } from "@/features/review/queries";
import {
  DeckIcon,
  FolderIcon,
  PersonIcon,
  ReviewIcon,
  SettingsIcon,
  TeamIcon,
} from "./icons";
import { DECK_KEYS, KeyboardLegend, REVIEW_KEYS } from "./keyboard-legend";

type NavItem = { href: string; label: string; icon: () => ReactNode; paths: string[] };

// Phone and tablet tabs. Review is only for students who own a project.
const TABS: (NavItem & { ownerOnly?: boolean })[] = [
  { href: "/feed", label: "Discover", icon: DeckIcon, paths: ["/feed"] },
  { href: "/projects", label: "Projects", icon: FolderIcon, paths: ["/projects"] },
  { href: "/applicants", label: "Review", icon: ReviewIcon, paths: ["/applicants"], ownerOnly: true },
  { href: "/teams", label: "Teams", icon: TeamIcon, paths: ["/teams"] },
  { href: "/profile", label: "Me", icon: PersonIcon, paths: ["/profile", "/settings"] },
];

// Desktop sidebar modes. Each one switches what the sidebar lists, and the stage follows.
const MODES: NavItem[] = [
  { href: "/feed", label: "Discover", icon: DeckIcon, paths: ["/feed", "/teams"] },
  { href: "/projects", label: "Projects", icon: FolderIcon, paths: ["/projects", "/applicants"] },
  { href: "/settings", label: "Settings", icon: SettingsIcon, paths: ["/settings"] },
];

const LEGENDS: Record<string, typeof DECK_KEYS> = {
  "/feed": DECK_KEYS,
  "/applicants": REVIEW_KEYS,
};

function isIn(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Arrow keys, Home and End move focus along a row of links, like the Tabs component.
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const links = [...event.currentTarget.querySelectorAll<HTMLElement>("a")];
  const index = links.indexOf(document.activeElement as HTMLElement);
  const last = links.length - 1;
  const next = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index <= 0 ? last : index - 1,
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
  const owned = projects.data?.filter((project) => project.status !== "archived") ?? [];
  const tabs = TABS.filter((tab) => !tab.ownerOnly || owned.length > 0);
  const legend = LEGENDS[pathname];

  return (
    <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0 lg:flex-row">
      <header className="sticky top-0 z-10 hidden items-center gap-6 border-b border-border bg-surface px-6 sm:flex lg:hidden">
        <Logo className="text-lg" />
        <nav aria-label="Main" onKeyDown={moveFocus} className="flex">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isIn(pathname, tab.paths) ? "page" : undefined}
              className="relative flex min-h-14 items-center px-3 text-sm font-semibold text-muted transition-colors duration-fast after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-pill after:bg-primary hover:text-text aria-[current=page]:text-text aria-[current=page]:after:scale-x-100"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <aside className="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-80 lg:shrink-0 lg:flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 bg-primary-strong px-4 py-3 text-on-primary">
          <Link
            href="/profile"
            className="flex min-h-11 items-center gap-2 rounded-pill pr-2 font-semibold focus-visible:outline-on-primary"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-surface text-xs font-bold text-text uppercase"
            >
              {user?.email[0] ?? "?"}
            </span>
            You
          </Link>
          <nav aria-label="Modes" onKeyDown={moveFocus} className="flex gap-1">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.href}
                  href={mode.href}
                  aria-label={mode.label}
                  aria-current={isIn(pathname, mode.paths) ? "page" : undefined}
                  className="grid size-11 place-items-center rounded-full text-on-primary transition-colors duration-fast hover:bg-on-primary/15 focus-visible:outline-on-primary aria-[current=page]:bg-surface aria-[current=page]:text-text"
                >
                  <Icon />
                </Link>
              );
            })}
          </nav>
        </div>
        <SidebarMode pathname={pathname} owned={owned} />
      </aside>

      <div className="flex flex-1 flex-col">
        {children}
        {legend && <KeyboardLegend key={pathname} keys={legend} />}
      </div>

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
              className="group flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted aria-[current=page]:font-semibold aria-[current=page]:text-text"
            >
              <span className="group-aria-[current=page]:text-primary">
                <Icon />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const rowLink = "flex min-h-11 items-center justify-between gap-2 rounded-row px-3 hover:bg-surface-2";

// What the sidebar lists in each mode. Rows for applications and teams arrive with F3-06 and F4-08.
function SidebarMode({ pathname, owned }: { pathname: string; owned: MyProject[] }) {
  if (isIn(pathname, ["/settings"])) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <h2 className="px-3 text-lg font-bold">Settings</h2>
        <Link href="/settings#appearance" className={`${rowLink} font-semibold`}>
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
                  <Link href="/projects/new" className={buttonClasses("secondary", "sm")}>
                    New project
                  </Link>
                  {owned.length === 0 ? (
                    <p className="px-3 text-sm text-muted">You don&apos;t own a project yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {owned.map((project) => (
                        <li key={project.id}>
                          <Link href={`/projects/${project.id}`} className={rowLink}>
                            <span className="font-semibold">{project.title}</span>
                            <span className="text-xs text-muted">{project.status}</span>
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href="/applicants" className={rowLink}>
                          Review applicants
                        </Link>
                      </li>
                    </ul>
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
            panel: <p className="px-3 text-sm text-muted">Roles you apply to show up here.</p>,
          },
          {
            id: "teams",
            label: "Teams",
            panel: (
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
