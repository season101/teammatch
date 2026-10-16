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

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
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
    onSuccess: (profile) => queryClient.setQueryData(["my-profile"], profile),
  });
}
