import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type MyProject = components["schemas"]["MyProject"];
export type Applicant = components["schemas"]["RoleApplication"];
type Decided = components["schemas"]["ApplicationDecision"];
export type Decision = { id: number; name: string; like: boolean };

export class DecideError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DecideError";
    this.status = status;
  }
}

// enabled: false skips the request, e.g. for a signed-out visitor in the app shell.
export function useMyProjects(enabled = true) {
  return useQuery({
    queryKey: ["my-projects"],
    enabled,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/projects/mine/");
      if (!data)
        throw new Error(`Could not load your projects (${response.status}).`);
      return data;
    },
  });
}

// Waiting applicants by default. "liked" lists the offers out, and "passed" and
// "declined" the people a filled role closed on.
// shortcut: first page (20) of a role's applicants; the review queue (F4-04) pages through the cursor.
export function useApplicants(
  roleId: number,
  status: "pending" | "liked" | "passed" | "declined" = "pending",
) {
  return useQuery({
    queryKey: ["applicants", roleId, status],
    queryFn: async () => {
      const { data, response } = await api.GET(
        "/api/v1/roles/{id}/applications/",
        {
          params: { path: { id: roleId }, query: { status } },
        },
      );
      if (!data)
        throw new Error(`Could not load applicants (${response.status}).`);
      return data.results;
    },
  });
}

export function useDecide(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation<Decided, DecideError, Decision>({
    mutationFn: async ({ id, like }) => {
      const init = {
        params: { path: { id } },
        headers: { "X-CSRFToken": csrfToken() },
      };
      const { data, error, response } = like
        ? await api.POST("/api/v1/applications/{id}/like/", init)
        : await api.POST("/api/v1/applications/{id}/pass/", init);
      if (data) return data;
      const detail = (error as { detail?: unknown } | undefined)?.detail;
      throw new DecideError(
        response.status,
        typeof detail === "string"
          ? detail
          : "Couldn't save your decision. Please try again.",
      );
    },
    // A like is an offer now (F4-10), so team_locked stays false; kept in case it ever isn't.
    onSuccess: (decided) => {
      if (decided.team_locked)
        queryClient.invalidateQueries({ queryKey: ["my-team"] });
    },
    // The decided applicant leaves the queue, a liked one joins Offers out, and the
    // Review badge counts one fewer.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-summary"] });
      return queryClient.invalidateQueries({ queryKey: ["applicants", roleId] });
    },
  });
}
