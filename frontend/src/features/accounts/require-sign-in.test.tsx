import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { RequireSignIn } from "./require-sign-in";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/profile",
}));

function mockSession(status: number, body: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RequireSignIn>{(user) => <p>Hello {user.email}</p>}</RequireSignIn>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockClear();
});

test("shows the page to a signed-in user", async () => {
  mockSession(200, {
    status: 200,
    data: { user: { id: 1, email: "sam@latech.edu" } },
  });
  renderPage();
  expect(await screen.findByText("Hello sam@latech.edu")).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("sends a signed-out visitor to sign in, then back here", async () => {
  mockSession(401, { status: 401 });
  renderPage();
  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fprofile"),
  );
  expect(screen.queryByText(/Hello/)).not.toBeInTheDocument();
});
