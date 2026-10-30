"use client";

import type { FormEvent } from "react";
import { buttonClasses } from "@/components/ui/button";

// Same limit as Application.note.
const NOTE_MAX = 300;

// The deck owns the note, so a right swipe sends whatever is typed here.
export function ApplyForm({
  roleId,
  note,
  onNoteChange,
  onApply,
}: {
  roleId: number;
  note: string;
  onNoteChange: (note: string) => void;
  onApply: () => void;
}) {
  const noteId = `note-${roleId}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor={noteId} className="text-sm font-medium">
        Note to the owner (optional)
      </label>
      <textarea
        id={noteId}
        rows={2}
        value={note}
        maxLength={NOTE_MAX}
        className="w-full rounded-input border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted hover:border-muted"
        onChange={(event) => onNoteChange(event.target.value)}
      />
      <p className="text-xs text-muted">
        {note.length}/{NOTE_MAX} characters
      </p>
      <button type="submit" className={`${buttonClasses("cta", "sm")} self-start`}>
        Apply
      </button>
    </form>
  );
}
