import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Logo } from "@/features/landing/logo";
import { RoleCardPreview } from "@/features/landing/role-card-preview";
import { Splash } from "@/features/landing/splash";

const steps = [
  ["Apply to roles", "Ranked by how many required skills you have."],
  ["Get an offer", "Hold several, then commit to one."],
  ["Lock the team", "Every role filled, chat opens."],
];

export default function Home() {
  return (
    <>
      <Splash />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo className="text-xl" />
        <div className="flex gap-2">
          <Link href="/login" className={buttonClasses("secondary")}>
            Sign in
          </Link>
          {/* The hero has the same button, so a phone's header keeps to one. */}
          <Link
            href="/login"
            className={`${buttonClasses("cta")} max-sm:hidden`}
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start items-center gap-12 px-4 pt-6 pb-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:content-normal lg:gap-16 lg:py-12">
        <div className="flex flex-col items-start gap-6">
          <Chip pill>For LA Tech students</Chip>
          <h1 className="font-display text-hero font-black text-balance">
            Build the team, <em>one role</em> at a time.
          </h1>
          <p className="max-w-prose text-lg text-muted">
            Swipe on open roles that fit your skills. Owners like you back.
            When every seat is filled, the team locks and chat opens.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/login" className={buttonClasses("cta", "lg")}>
              Sign up
            </Link>
            <p className="text-sm text-muted">
              Use your @latech.edu or @email.latech.edu email.
            </p>
          </div>
          <section aria-labelledby="how-heading" className="w-full max-w-2xl">
            <h2 id="how-heading" className="sr-only">
              How it works
            </h2>
            <ol className="grid gap-3 sm:grid-cols-3">
              {steps.map(([title, body], i) => (
                <li
                  key={title}
                  className="flex flex-col gap-2 rounded-row bg-surface p-4"
                >
                  <span
                    aria-hidden="true"
                    className="text-xs font-semibold text-muted"
                  >
                    {i + 1}
                  </span>
                  <strong>{title}</strong>
                  <span className="text-xs text-muted">{body}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <RoleCardPreview />
      </main>
    </>
  );
}
