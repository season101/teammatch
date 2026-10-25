"use client";

import Link from "next/link";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { SignOutButton } from "@/features/accounts/sign-out-button";
import {
  setShortcutsEnabled,
  setTheme,
  useShortcutsEnabled,
  useTheme,
  type Theme,
} from "@/features/shell/preferences";

const THEMES: [Theme, string][] = [
  ["system", "System"],
  ["dark", "Dark"],
  ["light", "Light"],
];

const sectionHeading = "text-xs font-semibold tracking-wider text-muted uppercase";
const card = "rounded-row border border-border bg-surface p-4";

export default function SettingsPage() {
  const shortcuts = useShortcutsEnabled();
  const theme = useTheme();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Settings</h1>

            <section id="appearance" aria-labelledby="appearance-heading" className="flex flex-col gap-2">
              <h2 id="appearance-heading" className={sectionHeading}>
                Appearance
              </h2>
              <div className={`${card} flex flex-col gap-3`}>
                <span id="theme-label" className="font-semibold">
                  Theme
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="theme-label"
                  className="grid grid-cols-3 gap-1 rounded-pill border border-border bg-surface-2 p-1"
                >
                  {THEMES.map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-11 cursor-pointer items-center justify-center rounded-pill text-sm font-semibold text-muted transition-colors duration-fast hover:text-text has-checked:bg-cta has-checked:text-on-cta has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={value}
                        checked={theme === value}
                        onChange={() => setTheme(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <section id="keyboard" aria-labelledby="keyboard-heading" className="flex flex-col gap-2">
              <h2 id="keyboard-heading" className={sectionHeading}>
                Keyboard
              </h2>
              <label className={`${card} flex items-center justify-between gap-4`}>
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">Keyboard shortcuts</span>
                  <span className="text-sm text-muted">
                    Use the keys, and show their legend under the card in Discover and Review.
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={shortcuts}
                  onChange={(event) => setShortcutsEnabled(event.target.checked)}
                  className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-pill border border-border bg-surface-2 transition-colors duration-fast before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-muted checked:border-primary checked:bg-primary checked:before:translate-x-5 checked:before:bg-on-primary motion-safe:before:transition-transform"
                />
              </label>
            </section>

            {/* Desktop has Profile and Sign out in the sidebar; phones and tablets have no sidebar. */}
            <section aria-labelledby="account-heading" className="flex flex-col gap-2 lg:hidden">
              <h2 id="account-heading" className={sectionHeading}>
                Account
              </h2>
              <Link href="/profile" className={`${card} flex items-center justify-between font-semibold`}>
                Profile
                <span aria-hidden="true">›</span>
              </Link>
              <div>
                <SignOutButton />
              </div>
            </section>
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
