import Link from "next/link";

import { HealthStatus } from "@/features/health/health-status";

const steps = [
  ["Post a project", "Owners list the roles they need, with the skills for each."],
  ["Swipe on roles", "Candidates get a deck of role cards ranked by skill match."],
  ["Like per role", "Owners go through applicants role by role."],
  ["Team locks", "When every role has a mutual like, the team forms and chat opens."],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 sm:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          CSC 5323 · Fall 2026
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">TeamMatch</h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">Swipe on roles, not people.</p>
        <p className="max-w-prose text-zinc-600 dark:text-zinc-400">
          Students post a project with open roles. Classmates swipe on the roles that fit their
          skills. Owners like or pass per role, and the team forms itself when every role is
          filled. Then team chat opens.
        </p>
        <div>
          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-lg font-semibold">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {steps.map(([title, body], i) => (
            <li
              key={title}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Step {i + 1}</p>
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <HealthStatus />
    </main>
  );
}
