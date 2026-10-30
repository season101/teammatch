import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type MyTeam = components["schemas"]["MyTeam"];

// My team this term, or null. enabled: false skips the request for a signed-out visitor.
export function useMyTeam(enabled = true) {
  return useQuery({
    queryKey: ["my-team"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/teams/mine/");
      if (!data) throw new Error(`Could not load your team (${response.status}).`);
      return data.team;
    },
  });
}

// The cache marks it seen straight away, so "It's a Team!" doesn't come back this visit.
export function useMarkSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.POST("/api/v1/teams/{id}/seen/", {
        params: { path: { id } },
        headers: { "X-CSRFToken": csrfToken() },
      }),
    onMutate: (id) =>
      queryClient.setQueryData<MyTeam | null>(["my-team"], (team) =>
        team?.id === id ? { ...team, seen_at: new Date().toISOString() } : team,
      ),
  });
}
