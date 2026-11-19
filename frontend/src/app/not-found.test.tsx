import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import NotFound from "./not-found";

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const signedIn = () =>
  reply(200, { status: 200, data: { user: { id: 1, email: "sam@latech.edu" } } });

function renderPage(session: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(session));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotFound />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

test("a signed-out visitor gets a way back to the landing page", async () => {
  renderPage(async () => reply(401, { status: 401 }));
  expect(
    screen.getByRole("heading", { name: "We couldn't find that page" }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "Back to TeamMatch" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("a signed-in student goes back to Discover", async () => {
  renderPage(async () => signedIn());
  expect(await screen.findByRole("link", { name: "Back to TeamMatch" })).toHaveAttribute(
    "href",
    "/feed",
  );
});

test("the link waits for the session check, so it can't send a student to the landing page", async () => {
  let answer: (response: Response) => void = () => {};
  renderPage(() => new Promise((resolve) => (answer = resolve)));
  expect(screen.queryByRole("link", { name: "Back to TeamMatch" })).not.toBeInTheDocument();

  answer(signedIn());
  expect(await screen.findByRole("link", { name: "Back to TeamMatch" })).toHaveAttribute(
    "href",
    "/feed",
  );
});
