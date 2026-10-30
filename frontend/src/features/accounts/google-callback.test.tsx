import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { GoogleCallback } from "./google-callback";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// allauth's session answer: 200 with the user, or 401 when nobody is signed in.
function mockSession(status: number) {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          status,
          data: { user: { id: 1, email: "sam@email.latech.edu" } },
        }),
        { status, headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderCallback(error?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // A "signed out" answer cached before the student left for Google.
  client.setQueryData(["session"], null);
  render(
    <QueryClientProvider client={client}>
      <GoogleCallback error={error} />
    </QueryClientProvider>,
  );
  return client;
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

test("signed in by Google: goes to the deck and caches the new session", async () => {
  mockSession(200);
  const client = renderCallback();

  expect(screen.getByRole("status")).toHaveTextContent("Signing you in…");
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/feed"));
  expect(client.getQueryData(["session"])).toEqual({
    id: 1,
    email: "sam@email.latech.edu",
  });
});

test("an error goes back to sign in, which shows the message", async () => {
  const fetchMock = mockSession(401);
  renderCallback("google_account_not_allowed");

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith(
      "/login?error=google_account_not_allowed",
    ),
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("no error but no session either: back to sign in with a general message", async () => {
  mockSession(401);
  renderCallback();
  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/login?error=unknown"),
  );
});
