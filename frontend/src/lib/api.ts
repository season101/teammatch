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
