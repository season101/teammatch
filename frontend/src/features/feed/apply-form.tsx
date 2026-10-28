"use client";

import { useState, type FormEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import { useApply } from "./queries";

// Same limit as Application.note.
const NOTE_MAX = 300;

export function ApplyForm({ roleId }: { roleId: number }) {
  const [note, setNote] = useState("");
  const apply = useApply();
  const noteId = `note-${roleId}`;

  if (apply.isSuccess) {
    return (
      <p role="status" className="text-sm text-success">
        Applied. The owner will see your note.
      </p>
    );
  }
  // 409: the role was just filled, or I already applied. Nothing left to do here.
  if (apply.error?.status === 409) {
    return (
      <p role="alert" className="text-sm text-pass">
        {apply.error.message}
      </p>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply.mutate({ role: roleId, note: note.trim() });
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
        disabled={apply.isPending}
        className="w-full rounded-input border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted hover:border-muted disabled:opacity-50"
        onChange={(event) => setNote(event.target.value)}
      />
      <p className="text-xs text-muted">
        {note.length}/{NOTE_MAX} characters
      </p>
      {apply.isError && (
        <p role="alert" className="text-sm text-pass">
          {apply.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={apply.isPending}
        className={`${buttonClasses("cta", "sm")} self-start`}
      >
        {apply.isPending ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}
