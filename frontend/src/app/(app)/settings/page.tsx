"use client";

import { RequireSignIn } from "@/features/accounts/require-sign-in";
import { SignOutButton } from "@/features/accounts/sign-out-button";
import { setShortcutsEnabled, useShortcutsEnabled } from "@/features/shell/keyboard-legend";

export default function SettingsPage() {
  const shortcuts = useShortcutsEnabled();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <RequireSignIn>
        {() => (
          <>
            <h1 className="text-2xl font-bold">Settings</h1>
            <label className="flex items-center justify-between gap-4 rounded-row border border-border bg-surface p-4">
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
            <div>
              <SignOutButton />
            </div>
          </>
        )}
      </RequireSignIn>
    </main>
  );
}
