"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { inputClass } from "@/components/ui/form-classes";
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
        <p className="text-sm text-muted">
          No skills yet. Search below to add some.
        </p>
      ) : (
        <ul aria-label="My skills" className="flex flex-wrap gap-2">
          {chosen.map((skill) => (
            <li key={skill.id}>
              <Chip
                variant="selected"
                pill
                onRemove={() =>
                  onChange(selected.filter((id) => id !== skill.id))
                }
              >
                {skill.name}
              </Chip>
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
          className={inputClass}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {full ? (
        <p className="text-sm text-muted">
          You can pick up to {MAX_SKILLS} skills.
        </p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-muted">No skills match your search.</p>
      ) : (
        <ul aria-label="Skills to add" className="flex flex-wrap gap-2">
          {matches.map((skill) => (
            <li key={skill.id}>
              <button
                type="button"
                className="rounded-pill border border-border px-3 py-1 text-sm text-text hover:border-muted"
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
        <p role="alert" className="text-sm text-pass">
          {error}
        </p>
      )}
    </fieldset>
  );
}
