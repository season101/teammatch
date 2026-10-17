"use client";

import { useState, type FormEvent } from "react";
import { useApply } from "./queries";

// Same limit as Application.note.
const NOTE_MAX = 300;

export function ApplyForm({ roleId }: { roleId: number }) {
  const [note, setNote] = useState("");
  const apply = useApply();
  const noteId = `note-${roleId}`;

  if (apply.isSuccess) {
    return (
      <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
        Applied. The owner will see your note.
      </p>
    );
  }
  // 409: the role was just filled, or I already applied. Nothing left to do here.
  if (apply.error?.status === 409) {
    return (
      <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
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
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        onChange={(event) => setNote(event.target.value)}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {note.length}/{NOTE_MAX} characters
      </p>
      {apply.isError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {apply.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={apply.isPending}
        className="self-start rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {apply.isPending ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}
