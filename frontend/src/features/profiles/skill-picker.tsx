"use client";

import { motion, MotionConfig } from "motion/react";
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { inputClass } from "@/components/ui/form-classes";
import type { Skill } from "./queries";

// Same cap as the API (skill_ids max_length in ProfileSerializer).
const MAX_SKILLS = 20;

// A picked skill travels to "My skills" and the rest close the gap. Positions are
// only re-measured when the selection changes, so typing in the search stays instant.
const travel = (id: number, picked: number) => ({
  layout: "position" as const,
  layoutId: `skill-${id}`,
  layoutDependency: picked,
  transition: { duration: 0.24, ease: [0.77, 0, 0.175, 1] as const },
});

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
    <MotionConfig reducedMotion="user">
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="font-medium">Skills</legend>

        {chosen.length === 0 ? (
          <p className="text-sm text-muted">
            No skills yet. Search below to add some.
          </p>
        ) : (
          <ul aria-label="My skills" className="flex flex-wrap gap-2">
            {chosen.map((skill) => (
              <motion.li key={skill.id} {...travel(skill.id, selected.length)}>
                <Chip
                  variant="selected"
                  pill
                  onRemove={() =>
                    onChange(selected.filter((id) => id !== skill.id))
                  }
                >
                  {skill.name}
                </Chip>
              </motion.li>
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
              <motion.li key={skill.id} {...travel(skill.id, selected.length)}>
                <button
                  type="button"
                  className="min-h-11 rounded-pill border border-border px-3 py-1 text-sm text-text hover:border-muted"
                  onClick={() => {
                    onChange([...selected, skill.id]);
                    setQuery("");
                  }}
                >
                  + {skill.name}
                </button>
              </motion.li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-sm text-pass">
            {error}
          </p>
        )}
      </fieldset>
    </MotionConfig>
  );
}
