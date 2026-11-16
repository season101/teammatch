"use client";

import { motion, MotionConfig } from "motion/react";
import { useRef, useState } from "react";
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
  const fieldset = useRef<HTMLFieldSetElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);

  const chosen = skills.filter((skill) => selected.includes(skill.id));
  const search = query.trim().toLowerCase();
  const matches = skills.filter(
    (skill) =>
      !selected.includes(skill.id) && skill.name.toLowerCase().includes(search),
  );
  const full = selected.length >= MAX_SKILLS;

  // The pressed button leaves its list. If it has focus, hand it to the next button in
  // that list (or the one before), or to the search box when the list goes away, so
  // focus doesn't drop to the page.
  function keepFocus(listStays = true) {
    const pressed = document.activeElement as HTMLButtonElement | null;
    const list = pressed?.closest("ul");
    if (!pressed || !list || !fieldset.current?.contains(list)) return;
    const buttons = [...list.querySelectorAll("button")];
    const i = buttons.indexOf(pressed);
    const next = listStays ? (buttons[i + 1] ?? buttons[i - 1]) : undefined;
    (next ?? searchBox.current)?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <fieldset ref={fieldset} className="flex flex-col gap-3" disabled={disabled}>
        <legend className="font-medium">Skills</legend>

        {chosen.length === 0 ? (
          <p className="text-sm text-muted">
            No skills yet. Search below to add some.
          </p>
        ) : (
          // 16px between rows on a phone, so the chips' 44px remove zones don't overlap.
          <ul aria-label="My skills" className="flex flex-wrap gap-x-2 gap-y-4 sm:gap-y-2">
            {chosen.map((skill) => (
              <motion.li key={skill.id} {...travel(skill.id, selected.length)}>
                <Chip
                  variant="selected"
                  pill
                  onRemove={() => {
                    keepFocus();
                    onChange(selected.filter((id) => id !== skill.id));
                  }}
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
            ref={searchBox}
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
                    // At the cap the list gives way to a message.
                    keepFocus(selected.length + 1 < MAX_SKILLS);
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
