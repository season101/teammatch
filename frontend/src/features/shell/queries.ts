import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Badge counts for the navigation, and whether my deck is open.
// enabled: false skips the request for a signed-out visitor.
export function useMySummary(enabled = true) {
  return useQuery({
    queryKey: ["my-summary"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/me/summary/");
      if (!data) throw new Error(`Could not load your summary (${response.status}).`);
      return data;
    },
  });
}
