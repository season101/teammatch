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
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <header>
        <h2 id={headingId} className="text-lg font-semibold">
          {role.title}
        </h2>
        <p className="text-sm text-muted">
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
                    ? "rounded-pill border border-success bg-surface-2 px-3 py-1 text-sm font-medium text-text"
                    : "rounded-pill border border-border px-3 py-1 text-sm text-text"
                }
              >
                {mine && <span aria-hidden="true">✓ </span>}
                {skill.name}
                {mine && (
                  <span className="sr-only"> (you have this skill)</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-text">
        {long && !expanded
          ? `${pitch.slice(0, PITCH_PREVIEW).trimEnd()}…`
          : pitch}{" "}
        {long && (
          <button
            type="button"
            aria-expanded={expanded}
            className="text-sm font-medium text-primary hover:underline"
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
