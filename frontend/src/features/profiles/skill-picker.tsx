"use client";

import { useState } from "react";
import type { Skill } from "./queries";

// Same cap as the API (skill_ids max_length in ProfileSerializer).
const MAX_SKILLS = 20;

type Props = {
  skills: Skill[];
  selected: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  error?: string;
};

// Only skills from the list can be picked, so made-up skills never reach the API (F1-04).
export function SkillPicker({
  skills,
  selected,
  onChange,
  disabled,
  error,
}: Props) {
  const [query, setQuery] = useState("");

  const chosen = skills.filter((skill) => selected.includes(skill.id));
  const search = query.trim().toLowerCase();
  const matches = skills.filter(
    (skill) =>
      !selected.includes(skill.id) && skill.name.toLowerCase().includes(search),
  );
  const full = selected.length >= MAX_SKILLS;

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="font-medium">Skills</legend>

      {chosen.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No skills yet. Search below to add some.
        </p>
      ) : (
        <ul aria-label="My skills" className="flex flex-wrap gap-2">
          {chosen.map((skill) => (
            <li
              key={skill.id}
              className="flex items-center gap-1 rounded-full bg-indigo-100 py-1 pl-3 pr-1 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100"
            >
              {skill.name}
              <button
                type="button"
                aria-label={`Remove ${skill.name}`}
                className="rounded-full px-2 hover:bg-indigo-200 dark:hover:bg-indigo-900"
                onClick={() =>
                  onChange(selected.filter((id) => id !== skill.id))
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="skill-search" className="text-sm font-medium">
          Search skills
        </label>
        <input
          id="skill-search"
          type="search"
          value={query}
          placeholder="e.g. Python"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {full ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You can pick up to {MAX_SKILLS} skills.
        </p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No skills match your search.
        </p>
      ) : (
        <ul aria-label="Skills to add" className="flex flex-wrap gap-2">
          {matches.map((skill) => (
            <li key={skill.id}>
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:border-indigo-500 dark:border-zinc-700"
                onClick={() => {
                  onChange([...selected, skill.id]);
                  setQuery("");
                }}
              >
                + {skill.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}
