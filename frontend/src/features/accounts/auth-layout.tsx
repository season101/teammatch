import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/features/landing/logo";

// Sign in or sign up, verify email and password reset: the logo, then one
// narrow column in the middle. These pages sit outside the app's navigation.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="px-4 py-4 sm:px-6">
        <Link href="/" aria-label="TeamMatch home">
          <Logo className="text-lg" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-100 flex-1 flex-col justify-center px-4 py-12">
        {children}
      </main>
    </>
  );
}

const icons = {
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  check: "m5 12.5 4.5 4.5L19 7",
  warning: "M12 4 3 20h18zM12 10v4M12 17h.01",
};

// The round icon above "Check your inbox", "You're verified" and "This link has expired".
export function StatusIcon({ name }: { name: keyof typeof icons }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-12 place-items-center rounded-full border border-border bg-surface"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
      >
        <path d={icons[name]} />
      </svg>
    </span>
  );
}
