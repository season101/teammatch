import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Logo } from "@/features/landing/logo";
import { RoleCardPreview } from "@/features/landing/role-card-preview";
import { Splash } from "@/features/landing/splash";

const steps = [
  ["Post a project", "List the roles it needs and the skills for each."],
  ["Swipe on roles", "Apply to roles that fit your skills, best match first."],
  ["Like per role", "Owners like or pass on candidates, one role at a time."],
  ["Team locks", "When every role is filled, the team locks and team chat opens."],
];

export default function Home() {
  return (
    <>
      <Splash />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo className="text-xl" />
        <Link href="/login" className={buttonClasses("secondary")}>
          Sign in
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pt-6 pb-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:py-12">
        <div className="flex flex-col items-start gap-6">
          <Chip pill>For @latech.edu students</Chip>
          <h1 className="font-display text-hero font-black text-balance">
            Swipe on roles, not <em>people</em>.
          </h1>
          <p className="max-w-prose text-lg text-muted">
            Post a project with the roles it needs, or swipe on roles that need
            your skills. When every role has a yes, your team locks and team
            chat opens.
          </p>
          <Link
            href="/signup"
            className={`${buttonClasses("cta", "lg")} w-full sm:w-auto`}
          >
            Create account
          </Link>
          <p className="hidden text-sm text-muted lg:block">
            Already have an account?{" "}
            <Link href="/login" className="text-text underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
        <RoleCardPreview />
      </main>

      <section aria-labelledby="how-heading" className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <h2 id="how-heading" className="sr-only">
            How it works
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden="true" className="font-mono text-lg text-muted">
                  {i + 1}
                </span>
                <p>
                  <span className="font-semibold">{title}.</span>{" "}
                  <span className="text-muted">{body}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
