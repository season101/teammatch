import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type MyApplication = components["schemas"]["MyApplication"];

export class WithdrawError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WithdrawError";
    this.status = status;
  }
}

// shortcut: first page only (the API's max, 50). A student applies to a handful of roles per term.
export function useMyApplications(enabled = true) {
  return useQuery({
    queryKey: ["my-applications"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/applications/mine/", {
        params: { query: { page_size: 50 } },
      });
      if (!data)
        throw new Error(
          `Could not load your applications (${response.status}).`,
        );
      return data.results;
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation<MyApplication, WithdrawError, number>({
    mutationFn: async (id) => {
      const { data, error, response } = await api.POST(
        "/api/v1/applications/{id}/withdraw/",
        {
          params: { path: { id } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (data) return data;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new WithdrawError(
        response.status,
        typeof detail === "string"
          ? detail
          : "Couldn't withdraw. Please try again.",
      );
    },
    // A 409 means it changed on the server (filled or passed), so refresh either way.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["my-applications"] }),
  });
}
