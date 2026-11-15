"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import { errorClass } from "@/components/ui/form-classes";
import { PendingLabel } from "@/components/ui/pending-label";
import { Avatar } from "./avatar";
import {
  AVATAR_HINT,
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  useSetAvatar,
  type MyProfile,
} from "./queries";

// Profile → Edit: the photo uploads as soon as it's picked, apart from Save profile (F1-07).
export function AvatarField({ profile }: { profile: MyProfile }) {
  const input = useRef<HTMLInputElement>(null);
  const setAvatar = useSetAvatar();
  // The picker's own check, before anything is sent.
  const [picked, setPicked] = useState("");
  const error = picked || setAvatar.error?.message;

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still fires
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
      setAvatar.reset();
      setPicked(AVATAR_HINT);
      return;
    }
    setPicked("");
    setAvatar.mutate(file);
  }

  return (
    <section aria-labelledby="photo-label" className="flex items-center gap-4">
      <Avatar
        name={profile.display_name ?? ""}
        url={profile.avatar_url}
        className="size-16 bg-surface-2 text-xl"
      />
      <div className="flex flex-col gap-2">
        <h2 id="photo-label" className="font-medium">
          Photo
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={setAvatar.isPending}
            className={buttonClasses("secondary", "sm")}
            onClick={() => input.current?.click()}
          >
            <PendingLabel
              pending={setAvatar.isPending && setAvatar.variables !== null}
              label="Uploading"
            >
              {profile.avatar_url ? "Change photo" : "Upload a photo"}
            </PendingLabel>
          </button>
          {profile.avatar_url && (
            <button
              type="button"
              disabled={setAvatar.isPending}
              className={buttonClasses("ghost", "sm")}
              onClick={() => {
                setPicked("");
                setAvatar.mutate(null);
              }}
            >
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={AVATAR_TYPES.join(",")}
          aria-label="Photo file"
          className="hidden"
          onChange={onPick}
        />
        {error ? (
          <p role="alert" className={errorClass}>
            {error}
          </p>
        ) : (
          setAvatar.isSuccess && (
            <p role="status" className="text-sm text-success">
              {setAvatar.variables ? "Photo updated." : "Photo removed."}
            </p>
          )
        )}
      </div>
    </section>
  );
}
