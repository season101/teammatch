import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type FeedRole = components["schemas"]["FeedRole"];
export type Application = components["schemas"]["Apply"];

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// First page only. Decided roles drop out of the feed, so the deck refetches
// this page when it runs out instead of following the cursor.
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

// Drops the role from the cached feed, so it doesn't come back when the deck
// mounts again. My applications is refetched, so the sidebar lists the new one.
export function useApply() {
  const queryClient = useQueryClient();
  return useMutation<Application, ApiError, { role: number; note?: string }>({
    mutationFn: async (body) => {
      const { data, error, response } = await api.POST("/api/v1/applications/", {
        body,
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (data) return data;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new ApiError(
        response.status,
        typeof detail === "string" ? detail : "Couldn't apply. Please try again.",
      );
    },
    onSuccess: (_, { role: id }) => {
      queryClient.setQueryData<FeedRole[]>(["feed"], (roles) =>
        roles?.filter((role) => role.id !== id),
      );
      return queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
    // 403: my team just locked, so the deck turns into the benched state, and the
    // lock liked one of my applications and withdrew the rest.
    onError: (error) => {
      if (error.status !== 403) return;
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
    // Not returned, so the deck doesn't wait for it. A 409 can mean I committed elsewhere.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-summary"] });
    },
  });
}

// Drops the card from the cached feed instead of refetching it.
// The swipe deck uses this for a left swipe.
export function useDismiss() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: async (id) => {
      const { error, response } = await api.POST("/api/v1/roles/{id}/dismiss/", {
        params: { path: { id } },
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (response.ok) return;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new ApiError(
        response.status,
        typeof detail === "string" ? detail : "Couldn't pass. Please try again.",
      );
    },
    onSuccess: (_, id) =>
      queryClient.setQueryData<FeedRole[]>(["feed"], (roles) =>
        roles?.filter((role) => role.id !== id),
      ),
  });
}

// Brings back every role I passed on. The deck refetches the feed itself.
export function useResetPasses() {
  return useMutation<void, ApiError>({
    mutationFn: async () => {
      const { error, response } = await api.POST("/api/v1/feed/reset/", {
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (response.ok) return;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new ApiError(
        response.status,
        typeof detail === "string" ? detail : "Couldn't show passed roles. Please try again.",
      );
    },
  });
}
