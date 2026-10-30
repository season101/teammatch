import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type FeedRole = components["schemas"]["FeedRole"];
export type Application = components["schemas"]["Apply"];

export class ApplyError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApplyError";
    this.status = status;
  }
}

// shortcut: first page (20 roles) only; the swipe deck (F3-03) pages through the cursor.
export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/feed/");
      if (!data) throw new Error(`Could not load roles (${response.status}).`);
      return data.results;
    },
  });
}

// The feed isn't refetched on success, so the card stays to show "Applied".
// My applications is, so the sidebar lists the new one straight away.
export function useApply() {
  const queryClient = useQueryClient();
  return useMutation<Application, ApplyError, { role: number; note: string }>({
    mutationFn: async (body) => {
      const { data, error, response } = await api.POST("/api/v1/applications/", {
        body,
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (data) return data;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new ApplyError(
        response.status,
        typeof detail === "string" ? detail : "Couldn't apply. Please try again.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-applications"] }),
  });
}
// Drops the card from the cached feed instead of refetching it, so cards I just
// applied to stay. The swipe deck (F3-03) reuses this for a left swipe.
export function useDismiss() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const { error, response } = await api.POST("/api/v1/roles/{id}/dismiss/", {
        params: { path: { id } },
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (response.ok) return;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new Error(
        typeof detail === "string" ? detail : "Couldn't pass. Please try again.",
      );
    },
    onSuccess: (_, id) =>
      queryClient.setQueryData<FeedRole[]>(["feed"], (roles) =>
        roles?.filter((role) => role.id !== id),
      ),
  });
}
