"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import { errorClass } from "@/components/ui/form-classes";
import { FileIcon, LinkCard } from "@/components/ui/link-card";
import { PendingLabel } from "@/components/ui/pending-label";
import {
  RESUME_MAX_BYTES,
  RESUME_NOT_PDF,
  RESUME_TOO_BIG,
  resumeUrl,
  useSetResume,
  type MyProfile,
} from "./queries";

// Profile → Edit, screen 51: add, read, replace or remove my resume (F1-16). It saves as
// soon as a file is picked, apart from Save profile, like the photo.
export function ResumeField({ profile }: { profile: MyProfile }) {
  const input = useRef<HTMLInputElement>(null);
  const setResume = useSetResume();
  // The picker's own check, before anything is sent. The server checks the bytes.
  const [picked, setPicked] = useState("");
  const error = picked || setResume.error?.message;
  const pick = () => input.current?.click();

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still fires
    if (!file) return;
    const problem =
      file.size > RESUME_MAX_BYTES
        ? RESUME_TOO_BIG
        : // Some browsers report a real PDF as octet-stream; the server checks the bytes.
          file.type && !["application/pdf", "application/octet-stream"].includes(file.type)
          ? RESUME_NOT_PDF
          : "";
    setPicked(problem);
    if (problem) setResume.reset();
    else setResume.mutate(file);
  }

  return (
    <section aria-labelledby="resume-label" className="flex flex-col gap-2">
      <h2 id="resume-label" className="font-medium">
        Resume
      </h2>
      {profile.has_resume ? (
        <>
          <LinkCard
            external
            href={resumeUrl(profile.id)}
            icon={<FileIcon />}
            title={profile.resume_name || "Resume"}
            detail="Tap to read. Only owners you apply to can open it."
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={setResume.isPending}
              className={buttonClasses("secondary", "sm")}
              onClick={pick}
            >
              <PendingLabel
                pending={setResume.isPending && setResume.variables !== null}
                label="Uploading"
              >
                Replace
              </PendingLabel>
            </button>
            <button
              type="button"
              disabled={setResume.isPending}
              className={buttonClasses("ghost", "sm")}
              onClick={() => {
                setPicked("");
                setResume.mutate(null);
              }}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={setResume.isPending}
          className="flex min-h-11 flex-col items-center gap-1 rounded-card border border-dashed border-border bg-surface p-5 text-center hover:bg-surface-2 disabled:opacity-50"
          onClick={pick}
        >
          <span className="grid size-10 place-items-center rounded-row border border-border bg-surface-2">
            <FileIcon />
          </span>
          <PendingLabel pending={setResume.isPending} label="Uploading">
            <span className="font-semibold">Add your resume</span>
          </PendingLabel>
          <span className="text-sm text-muted">
            PDF, up to 5 MB. Adds 10% to profile strength.
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="Resume file"
        className="hidden"
        onChange={onPick}
      />
      {error ? (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      ) : (
        setResume.isSuccess && (
          <p role="status" className="text-sm text-success">
            {setResume.variables ? "Resume added." : "Resume removed."}
          </p>
        )
      )}
    </section>
  );
}
