import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api, csrfToken } from "@/lib/api";

export type MyProject = components["schemas"]["MyProject"];
export type Applicant = components["schemas"]["RoleApplication"];
type Decided = components["schemas"]["ApplicationDecision"];
export type Decision = { id: number; name: string; like: boolean };

export class DecideError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "DecideError";
    this.status = status;
    this.code = code;
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
  const waiting = ["applicants", roleId, "pending"];
  const offers = ["applicants", roleId, "liked"];
  type Lists = { waiting?: Applicant[]; offers?: Applicant[] };
  return useMutation<Decided, DecideError, Decision, Lists>({
    mutationKey: ["decide", roleId],
    // The applicant leaves the queue on the press, and a liked one joins Offers out.
    // Nothing waits for the request, so the next applicant can be decided at once.
    onMutate: async ({ id, like }) => {
      await queryClient.cancelQueries({ queryKey: ["applicants", roleId] });
      const before: Lists = {
        waiting: queryClient.getQueryData<Applicant[]>(waiting),
        offers: queryClient.getQueryData<Applicant[]>(offers),
      };
      const decided = before.waiting?.find((application) => application.id === id);
      queryClient.setQueryData<Applicant[]>(waiting, (list) =>
        list?.filter((application) => application.id !== id),
      );
      if (like && decided)
        queryClient.setQueryData<Applicant[]>(offers, (list) => [...(list ?? []), decided]);
      return before;
    },
    // The server said no: both lists go back, and the queue shows why.
    onError: (_error, _decision, before) => {
      queryClient.setQueryData(waiting, before?.waiting);
      queryClient.setQueryData(offers, before?.offers);
    },
    mutationFn: async ({ id, like }) => {
      const init = {
        params: { path: { id } },
        headers: { "X-CSRFToken": csrfToken() },
      };
      const { data, error, response } = like
        ? await api.POST("/api/v1/applications/{id}/like/", init)
        : await api.POST("/api/v1/applications/{id}/pass/", init);
      if (data) return data;
      const { detail, code } = (error ?? {}) as { detail?: unknown; code?: unknown };
      throw new DecideError(
        response.status,
        typeof detail === "string"
          ? detail
          : "Couldn't save your decision. Please try again.",
        typeof code === "string" ? code : undefined,
      );
    },
    // A like is an offer now (F4-10), so team_locked stays false; kept in case it ever isn't.
    onSuccess: (decided) => {
      if (decided.team_locked)
        queryClient.invalidateQueries({ queryKey: ["my-team"] });
    },
    // The decided applicant leaves the queue, a liked one joins Offers out, and the
    // Review badge counts one fewer.
    // Refetch once the last decision in a quick run lands; an earlier refetch
    // would bring back people who are already decided.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-summary"] });
      if (queryClient.isMutating({ mutationKey: ["decide", roleId] }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: ["applicants", roleId] });
    },
  });
}
