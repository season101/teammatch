"use client";

// Same limit as Application.note.
const NOTE_MAX = 300;

// Left the deck in UI-06 (DD-40). The role details page (F3-13) and Apply on the
// project page (#172) use it.
export function NoteField({
  roleId,
  note,
  onNoteChange,
  autoFocus,
}: {
  roleId: number;
  note: string;
  onNoteChange: (note: string) => void;
  // For a field that opens on a tap, so typing can start at once.
  autoFocus?: boolean;
}) {
  const noteId = `note-${roleId}`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={noteId} className="text-sm font-medium">
        Note to the owner (optional)
      </label>
      <textarea
        id={noteId}
        rows={2}
        value={note}
        maxLength={NOTE_MAX}
        autoFocus={autoFocus}
        className="w-full rounded-input border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted hover:border-muted"
        onChange={(event) => onNoteChange(event.target.value)}
      />
      <p className="text-xs text-muted">
        {note.length}/{NOTE_MAX} characters
      </p>
    </div>
  );
}
