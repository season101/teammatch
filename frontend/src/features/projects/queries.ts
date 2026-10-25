import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api } from "@/lib/api";

export type Project = components["schemas"]["Project"];
export type ProjectInput = components["schemas"]["ProjectRequest"];
export type FieldErrors = Partial<Record<keyof ProjectInput, string>>;
export type ProjectListItem = components["schemas"]["ProjectList"];
export type ProjectDetail = components["schemas"]["ProjectDetail"];
export type RoleInput = components["schemas"]["RoleRequest"];

export class CreateProjectError extends Error {
  status: number;
  fields: FieldErrors;

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = "CreateProjectError";
    this.status = status;
    this.fields = fields;
  }
}

// Django checks a CSRF token on POSTs from a signed-in user. It is stored in a cookie.
function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// Handles Django REST Framework's default error body ({ title: ["..."], detail: "..." })
// and the team's planned shape ({ error: { message, fields } }).
function readErrors(body: unknown): { message: string; fields: FieldErrors } {
  const record = (body ?? {}) as Record<string, unknown>;
  const nested = (record.error ?? {}) as Record<string, unknown>;
  const source = (nested.fields ?? record) as Record<string, unknown>;

  const fields: FieldErrors = {};
  for (const key of ["title", "pitch"] as const) {
    const value = source[key];
    if (Array.isArray(value) && value.length > 0)
      fields[key] = String(value[0]);
  }

  let message = "";
  if (typeof nested.message === "string") message = nested.message;
  else if (typeof record.detail === "string") message = record.detail;
  return { message, fields };
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<Project, CreateProjectError, ProjectInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/api/v1/projects/", {
        body: input,
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (data) return data;
      const { message, fields } = readErrors(error);
      throw new CreateProjectError(response.status, message, fields);
    },
    // The app shell's Projects → Mine list and Review tab read this.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-projects"] }),
  });
}

// The API gives back a full "next" URL, and we only need its cursor.
function cursorFrom(next: string | null | undefined): string | undefined {
  if (!next) return undefined;
  return (
    new URL(next, "http://localhost").searchParams.get("cursor") ?? undefined
  );
}

export function useOpenProjects() {
  return useInfiniteQuery({
    queryKey: ["projects", "open"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, response } = await api.GET("/api/v1/projects/", {
        params: { query: { cursor: pageParam } },
      });
      if (!data)
        throw new Error(`Could not load projects (${response.status})`);
      return data;
    },
    getNextPageParam: (lastPage) => cursorFrom(lastPage.next),
  });
}

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// Django REST Framework's default bodies: { detail: "..." } or { field: ["..."] }.
function apiError(status: number, body: unknown): ApiError {
  const record = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && typeof value[0] === "string")
      fields[key] = value[0];
  }
  const message = typeof record.detail === "string" ? record.detail : "";
  return new ApiError(status, message, fields);
}

export function useProject(projectId: number) {
  return useQuery<ProjectDetail, ApiError>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/projects/{id}/", {
        params: { path: { id: projectId } },
      });
      if (!data)
        throw new ApiError(response.status, "Could not load the project.");
      return data;
    },
  });
}

export function useAddRole(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, RoleInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST(
        "/api/v1/projects/{id}/roles/",
        {
          params: { path: { id: projectId } },
          body: input,
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}

export function useUpdateRole(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { roleId: number; input: RoleInput }>({
    mutationFn: async ({ roleId, input }) => {
      const { data, error, response } = await api.PATCH("/api/v1/roles/{id}/", {
        params: { path: { id: roleId } },
        body: input,
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });
}

export function usePublishProject(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const { data, error, response } = await api.POST(
        "/api/v1/projects/{id}/publish/",
        {
          params: { path: { id: projectId } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useDeleteRole(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: async (roleId) => {
      const { error, response } = await api.DELETE("/api/v1/roles/{id}/", {
        params: { path: { id: roleId } },
        headers: { "X-CSRFToken": csrfToken() },
      });
      if (!response.ok) throw apiError(response.status, error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { title: string; pitch: string }>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH(
        "/api/v1/projects/{id}/",
        {
          params: { path: { id: projectId } },
          body: input,
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}

export function useCloseProject(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const { data, error, response } = await api.POST(
        "/api/v1/projects/{id}/close/",
        {
          params: { path: { id: projectId } },
          headers: { "X-CSRFToken": csrfToken() },
        },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    },
  });
}
