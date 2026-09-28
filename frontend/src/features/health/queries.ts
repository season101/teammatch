import { useQuery } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api } from "@/lib/api";

export type Health = components["schemas"]["Health"];

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async (): Promise<Health> => {
      const { data, error } = await api.GET("/api/v1/health/");
      if (error || !data) throw new Error("API unreachable");
      return data;
    },
    refetchInterval: 15_000,
    retry: false,
  });
}
