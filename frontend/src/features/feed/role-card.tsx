"use client";

import { useState, type ReactNode } from "react";
import type { FeedRole } from "./queries";

const PITCH_PREVIEW = 160;

export function RoleCard({
  role,
  mySkillIds,
  children,
}: {
  role: FeedRole;
  mySkillIds: number[];
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const pitch = role.project.pitch;
  const long = pitch.length > PITCH_PREVIEW;
  const headingId = `role-${role.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800"
    >
      <header>
        <h2 id={headingId} className="text-lg font-semibold">
          {role.title}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {role.project.title} · by {role.project.owner_name || "a classmate"}
        </p>
      </header>

      {role.required_skills.length > 0 && (
        <ul aria-label="Required skills" className="flex flex-wrap gap-2">
          {role.required_skills.map((skill) => {
            const mine = mySkillIds.includes(skill.id);
            return (
              <li
                key={skill.id}
                className={
                  mine
                    ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                    : "rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                }
              >
                {mine && <span aria-hidden="true">✓ </span>}
                {skill.name}
                {mine && <span className="sr-only"> (you have this skill)</span>}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-zinc-700 dark:text-zinc-300">
        {long && !expanded
          ? `${pitch.slice(0, PITCH_PREVIEW).trimEnd()}…`
          : pitch}{" "}
        {long && (
          <button
            type="button"
            aria-expanded={expanded}
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </p>

      {children}
    </article>
  );
}
