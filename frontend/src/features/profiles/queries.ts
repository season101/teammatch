import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api } from "@/lib/api";

export type MyProfile = components["schemas"]["MyProfile"];
export type Skill = components["schemas"]["Skill"];
export type ProfileInput = components["schemas"]["PatchedMyProfileRequest"];
export type FieldErrors = Partial<Record<keyof ProfileInput, string>>;

export class SaveProfileError extends Error {
  status: number;
  fields: FieldErrors;

  constructor(status: number, fields: FieldErrors = {}) {
    super("Could not save the profile.");
    this.name = "SaveProfileError";
    this.status = status;
    this.fields = fields;
  }
}

// Django checks a CSRF token on a PATCH from a signed-in user. It is stored in a cookie.
function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// DRF sends { bio: ["..."] }. For skill_ids the message can be nested, so fall back to our own.
function readFieldErrors(body: unknown): FieldErrors {
  const record = (body ?? {}) as Record<string, unknown>;
  const fields: FieldErrors = {};
  for (const key of ["display_name", "bio", "major"] as const) {
    const value = record[key];
    if (Array.isArray(value) && value.length > 0)
      fields[key] = String(value[0]);
  }
  if (record.skill_ids) fields.skill_ids = "Pick skills from the list only.";
  return fields;
}

// enabled: false skips the request for a signed-out visitor.
export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: ["my-profile"],
    enabled,
    // Always refetched on mount, despite the app's 30 s default (PL-17): the welcome
    // steps and the profile form wait for isFetchedAfterMount, which never comes otherwise.
    staleTime: 0,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/me/profile/");
      if (!data)
        throw new Error(`Could not load the profile (${response.status}).`);
      return data;
    },
  });
}

// The whole list (about 20 skills), searched in the browser. It only changes with a migration.
export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/skills/");
      if (!data)
        throw new Error(`Could not load the skill list (${response.status}).`);
      return data;
    },
    staleTime: Infinity,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation<MyProfile, SaveProfileError, ProfileInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH("/api/v1/me/profile/", {
        body: input,
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (data) return data;
      throw new SaveProfileError(response.status, readFieldErrors(error));
    },
    // The photo saves on its own and the two replies can cross. A PATCH never changes
    // the photo, so keep the cached one: a late reply can't bring back the old photo.
    onSuccess: async (profile) => {
      await queryClient.cancelQueries({ queryKey: ["my-profile"] });
      queryClient.setQueryData<MyProfile>(["my-profile"], (old) =>
        old ? { ...profile, avatar_url: old.avatar_url } : profile,
      );
    },
  });
}

// The server's own rule (F1-07); the picker checks it first so nothing big is sent.
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_HINT = "Choose a JPEG, PNG or WebP image of 2 MB or less.";

// A file uploads a new photo; null removes it. Either way the API answers with my profile.
export function useSetAvatar() {
  const queryClient = useQueryClient();
  return useMutation<MyProfile, Error, File | null>({
    mutationFn: async (file) => {
      const headers = { "X-CSRFToken": csrfToken() };
      let result;
      if (file) {
        const form = new FormData();
        form.append("avatar", file);
        // openapi-fetch sends FormData as it is; the schema calls the file a string.
        result = await api.POST("/api/v1/me/avatar/", {
          body: form as unknown as { avatar: string },
          headers,
        });
      } else {
        result = await api.DELETE("/api/v1/me/avatar/", { headers });
      }
      if (result.data) return result.data;
      throw new Error(
        result.response.status === 400
          ? AVATAR_HINT
          : "Couldn't update your photo. Please try again.",
      );
    },
    // Only the photo, for the same reason: the form's fields may have saved meanwhile.
    // A profile GET that left before the upload would bring back the old photo, so stop it.
    onSuccess: async (profile) => {
      await queryClient.cancelQueries({ queryKey: ["my-profile"] });
      queryClient.setQueryData<MyProfile>(["my-profile"], (old) =>
        old ? { ...old, avatar_url: profile.avatar_url } : profile,
      );
    },
  });
}

// "I agree" on Team rules (DD-47). The API answers 204, so the time is filled in here.
export function useAcceptRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { response } = await api.POST("/api/v1/me/rules/accept/", {
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (!response.ok)
        throw new Error(`Could not save the rules (${response.status}).`);
    },
    onSuccess: () =>
      queryClient.setQueryData<MyProfile>(
        ["my-profile"],
        (profile) =>
          profile && {
            ...profile,
            rules_accepted_at:
              profile.rules_accepted_at ?? new Date().toISOString(),
          },
      ),
  });
}
