import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type MyApplication = components["schemas"]["MyApplication"];
type Committed = components["schemas"]["Commit"];

export class ApplicationError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApplicationError";
    this.status = status;
    this.code = code;
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

// Single-message errors come as { detail, code }.
const failed = (status: number, error: unknown, fallback: string) => {
  const { detail, code } = (error ?? {}) as { detail?: unknown; code?: unknown };
  return new ApplicationError(
    status,
    typeof detail === "string" ? detail : fallback,
    typeof code === "string" ? code : undefined,
  );
};

// Offers, counts and the deck state all move on a withdraw, commit or decline. A 409
// means it changed on the server (filled, passed, committed elsewhere), so refresh either way.
function refresh(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["my-summary"] });
  return queryClient.invalidateQueries({ queryKey: ["my-applications"] });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation<MyApplication, ApplicationError, number>({
    mutationFn: async (id) => {
      const { data, error, response } = await api.POST(
        "/api/v1/applications/{id}/withdraw/",
        {
          params: { path: { id } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (data) return data;
      throw failed(response.status, error, "Couldn't withdraw. Please try again.");
    },
    onSettled: () => refresh(queryClient),
  });
}

export const isBlocked = (error: ApplicationError | null) =>
  error?.code === "owns_open_project";

// Takes the seat. My other offers and pending applications close with it (F4-10).
export function useCommit() {
  const queryClient = useQueryClient();
  return useMutation<Committed, ApplicationError, number>({
    mutationFn: async (id) => {
      const { data, error, response } = await api.POST(
        "/api/v1/applications/{id}/commit/",
        {
          params: { path: { id } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (data) return data;
      throw failed(response.status, error, "Couldn't commit. Please try again.");
    },
    onSuccess: (committed) => {
      // The last role: the app shell refetches my team and shows "It's a Team!".
      if (committed.team_locked)
        queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    },
    onSettled: () => refresh(queryClient),
  });
}

export function useDecline() {
  const queryClient = useQueryClient();
  return useMutation<MyApplication, ApplicationError, number>({
    mutationFn: async (id) => {
      const { data, error, response } = await api.POST(
        "/api/v1/applications/{id}/decline/",
        {
          params: { path: { id } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (data) return data;
      throw failed(response.status, error, "Couldn't decline. Please try again.");
    },
    onSettled: () => refresh(queryClient),
  });
}
