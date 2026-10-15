// Talks to django-allauth's headless "browser" API (sign up, verify email, sign in).
// These routes live under /_allauth, not /api, so they aren't in the generated api-client.
const BASE = "/_allauth/browser/v1";

export type AllauthError = { message: string; code: string; param?: string };

export type AllauthResult = {
  status: number;
  errors: AllauthError[];
};

// Django wants this token on every POST to prove the request came from our own site.
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function allauthPost(
  path: string,
  body: unknown,
): Promise<AllauthResult> {
  // No token yet? Any allauth GET makes Django set the csrftoken cookie.
  if (!getCsrfToken()) {
    await fetch(`${BASE}/auth/session`, { credentials: "same-origin" });
  }
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, errors: data.errors ?? [] };
}
