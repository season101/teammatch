import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Badge counts for the navigation, and whether my deck is open.
// enabled: false skips the request for a signed-out visitor.
export function useMySummary(enabled = true) {
  return useQuery({
    queryKey: ["my-summary"],
    enabled,
    // shortcut: refreshes every minute and on focus, not after each apply or like.
    // Invalidate ["my-summary"] from those mutations if the badges feel stale.
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/me/summary/");
      if (!data) throw new Error(`Could not load your summary (${response.status}).`);
      return data;
    },
  });
}
