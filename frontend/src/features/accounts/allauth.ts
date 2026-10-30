// Talks to django-allauth's headless "browser" API (sign up, verify email, sign in).
// These routes live under /_allauth, not /api, so they aren't in the generated api-client.
const BASE = "/_allauth/browser/v1";

export type AllauthError = { message: string; code: string; param?: string };

export type AllauthResult = {
  status: number;
  errors: AllauthError[];
};

export type SessionUser = { id: number; email: string };

// Django wants this token on every POST to prove the request came from our own site.
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// No token yet? Any allauth GET makes Django set the csrftoken cookie.
async function ensureCsrfToken() {
  if (!getCsrfToken()) {
    await fetch(`${BASE}/auth/session`, { credentials: "same-origin" });
  }
}

export async function allauthPost(
  path: string,
  body: unknown,
): Promise<AllauthResult> {
  await ensureCsrfToken();
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

// Who is signed in? allauth answers 200 with the user, or 401 when nobody is.
export async function getSessionUser(): Promise<SessionUser | null> {
  const response = await fetch(`${BASE}/auth/session`, {
    credentials: "same-origin",
  });
  if (response.status !== 200) return null;
  const data = await response.json().catch(() => ({}));
  return data.data?.user ?? null;
}

// Ends the session. allauth answers 401 ("no longer signed in") when it worked.
export async function signOut(): Promise<void> {
  await ensureCsrfToken();
  await fetch(`${BASE}/auth/session`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}

// Which sign-in providers (like Google) the server has keys for. Empty when none.
export async function getProviders(): Promise<string[]> {
  const response = await fetch(`${BASE}/config`, {
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  const providers: { id: string }[] = data.data?.socialaccount?.providers ?? [];
  return providers.map((provider) => provider.id);
}

// Sends the browser to Google. A real form POST, not fetch, so allauth can
// redirect the whole page. Google then comes back to /auth/callback.
export async function continueWith(provider: string) {
  await ensureCsrfToken();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${BASE}/auth/provider/redirect`;
  const fields = {
    provider,
    callback_url: "/auth/callback",
    process: "login",
    csrfmiddlewaretoken: getCsrfToken(),
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}
