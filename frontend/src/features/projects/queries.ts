import { useMutation } from "@tanstack/react-query";
import type { components } from "@teammatch/api-client";
import { api } from "@/lib/api";

export type Project = components["schemas"]["Project"];
export type ProjectInput = components["schemas"]["ProjectRequest"];
export type FieldErrors = Partial<Record<keyof ProjectInput, string>>;

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
    if (Array.isArray(value) && value.length > 0) fields[key] = String(value[0]);
  }

  let message = "";
  if (typeof nested.message === "string") message = nested.message;
  else if (typeof record.detail === "string") message = record.detail;
  return { message, fields };
}

export function useCreateProject() {
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
  });
}
