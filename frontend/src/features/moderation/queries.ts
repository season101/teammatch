import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type Term = components["schemas"]["Term"];
export type TermInput = components["schemas"]["TermRequest"];
export type Moderator = components["schemas"]["Moderator"];
export type ModerationProject = components["schemas"]["ModerationProject"];

const headers = () => ({ "X-CSRFToken": csrfToken() });

// The API's own words when it sends some ({ field: ["..."] } or { detail: "..." }).
function failure(error: unknown, fallback: string) {
  const record = (error ?? {}) as Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") return new Error(value[0]);
  }
  return new Error(typeof record.detail === "string" ? record.detail : fallback);
}

// The three lists on the admin's moderation page. enabled: false for anyone who isn't one.
export function useTerms(enabled = true) {
  return useQuery({
    queryKey: ["moderation", "terms"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/moderation/terms/");
      if (!data) throw new Error(`Could not load the terms (${response.status}).`);
      return data;
    },
  });
}

export function useModerators(enabled = true) {
  return useQuery({
    queryKey: ["moderation", "moderators"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/moderation/moderators/");
      if (!data) throw new Error(`Could not load the moderators (${response.status}).`);
      return data;
    },
  });
}

export function useModerationProjects(enabled = true) {
  return useQuery({
    queryKey: ["moderation", "projects"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/moderation/projects/");
      if (!data) throw new Error(`Could not load the projects (${response.status}).`);
      return data;
    },
  });
}

// Every change refetches the page's lists: demoting someone also empties their projects.
function useChange<Input>(change: (input: Input) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, Input>({
    mutationFn: change,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderation"] }),
  });
}

export function useCreateTerm() {
  return useChange<TermInput>(async (body) => {
    const { error } = await api.POST("/api/v1/moderation/terms/", {
      body,
      headers: headers(),
    });
    if (error) throw failure(error, "Couldn't add the term. Please try again.");
  });
}

export function usePromote() {
  return useChange<string>(async (email) => {
    const { error } = await api.POST("/api/v1/moderation/moderators/", {
      body: { email },
      headers: headers(),
    });
    if (error) throw failure(error, "Couldn't make them a moderator. Please try again.");
  });
}

export function useDemote() {
  return useChange<number>(async (id) => {
    const { response } = await api.DELETE("/api/v1/moderation/moderators/{id}/", {
      params: { path: { id } },
      headers: headers(),
    });
    if (!response.ok) throw new Error("Couldn't remove the moderator. Please try again.");
  });
}

// on: true puts the moderator on the project, false takes them off.
export function useAssign() {
  return useChange<{ project: number; user: number; on: boolean }>(
    async ({ project, user, on }) => {
      const options = {
        params: { path: { id: project, user_pk: user } },
        headers: headers(),
      };
      const path = "/api/v1/moderation/projects/{id}/moderators/{user_pk}/";
      const { response } = on ? await api.PUT(path, options) : await api.DELETE(path, options);
      if (!response.ok) throw new Error("Couldn't change the moderators. Please try again.");
    },
  );
}
