"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { noticeClass } from "@/components/ui/form-classes";
import { StatusChip } from "@/features/applications/my-applications";
import { useMyApplications } from "@/features/applications/queries";
import { NoteField } from "@/features/feed/note-field";
import { useApply } from "@/features/feed/queries";

// Apply to one open role from the project page (#172). Same API, note limit and
// error messages as the swipe deck. An existing application, whatever its
// status, blocks another one (BR-02), so it shows as a status instead.
export function ApplyToRole({
  roleId,
  roleTitle,
}: {
  roleId: number;
  roleTitle: string;
}) {
  const applications = useMyApplications();
  const apply = useApply();
  const [note, setNote] = useState("");

  if (applications.isPending) return null;

  const status =
    applications.data?.find((application) => application.role.id === roleId)
      ?.status ?? (apply.isSuccess ? apply.data.status : undefined);

  if (status) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm">
        <span className="font-medium">Applied</span>
        <StatusChip status={status} />
      </p>
    );
  }

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        apply.mutate(
          { role: roleId, note: note.trim() },
          {
            // 409: I already applied, or the role was just filled. Show what the server has.
            onError: (error) => {
              if (error.status === 409) void applications.refetch();
            },
          },
        );
      }}
    >
      <NoteField roleId={roleId} note={note} onNoteChange={setNote} />
      <Button
        type="submit"
        size="sm"
        className="self-start hover:bg-apply hover:text-on-apply active:bg-apply active:text-on-apply"
        disabled={apply.isPending}
        aria-label={`Apply to ${roleTitle}`}
      >
        {apply.isPending ? "Applying…" : "Apply"}
      </Button>
      {apply.isError && (
        <p role="alert" className={noticeClass}>
          {apply.error.message}
        </p>
      )}
    </form>
  );
}
