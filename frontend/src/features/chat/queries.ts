import { queryOptions, useQuery } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api } from "@/lib/api";

export type ChatMessage = components["schemas"]["ChatMessage"];

// The last 50 messages, newest first (F4-09). Older pages aren't loaded yet.
export const teamMessagesQuery = (teamId: number) =>
  queryOptions({
    queryKey: ["team-messages", teamId],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/teams/{id}/messages/", {
        params: { path: { id: teamId } },
      });
      if (!data) throw new Error(`Could not load messages (${response.status}).`);
      return data.results;
    },
  });

export function useTeamMessages(teamId: number) {
  return useQuery(teamMessagesQuery(teamId));
}
