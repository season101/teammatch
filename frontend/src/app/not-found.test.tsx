import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import NotFound from "./not-found";

function renderPage(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotFound />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

test("a signed-out visitor gets a way back to the landing page", async () => {
  renderPage(401, { status: 401 });
  expect(
    screen.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(screen.getByRole("link", { name: "Back to TeamMatch" })).toHaveAttribute("href", "/");
});

test("a signed-in student goes back to Discover", async () => {
  renderPage(200, { status: 200, data: { user: { id: 1, email: "sam@latech.edu" } } });
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Back to TeamMatch" })).toHaveAttribute(
      "href",
      "/feed",
    ),
  );
});
