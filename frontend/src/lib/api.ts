import createClient from "openapi-fetch";
import type { paths } from "@teammatch/api-client";

// Same origin: Next rewrites /api to the Django container.
const baseUrl = typeof window === "undefined" ? "" : window.location.origin;

export const api = createClient<paths>({
  baseUrl,
  credentials: "same-origin",
  // look fetch up per call so tests can stub it
  fetch: (request) => globalThis.fetch(request),
});

// Django checks a CSRF token on writes from a signed-in user. It is stored in a cookie.
export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
