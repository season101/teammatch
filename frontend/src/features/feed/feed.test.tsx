import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { Feed } from "./feed";

const role = {
  id: 7,
  title: "Backend dev",
  description: "APIs",
  created_at: "2026-10-16T00:00:00Z",
  project: { id: 3, title: "TeamMatch", pitch: "Find a team", owner_name: "Olive" },
  required_skills: [{ id: 1, name: "Python", slug: "python" }],
};

const profile = {
  id: 1,
  display_name: "Sam",
  bio: "",
  major: "CS",
  email: "sam@latech.edu",
  skills: [{ id: 1, name: "Python", slug: "python" }],
};

// Answers by method and path; records the apply and pass requests.
function mockApi({
  roles = [role],
  apply = { status: 201, body: {} as unknown },
  dismiss = { status: 204, body: null as unknown },
} = {}) {
  const applies: Request[] = [];
  const dismisses: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      let status = 200;
      let body: unknown = {};
      if (path === "/api/v1/feed/") body = { next: null, previous: null, results: roles };
      else if (path === "/api/v1/me/profile/") body = profile;
      else if (path === "/api/v1/applications/" && request.method === "POST") {
        applies.push(request.clone());
        ({ status, body } = apply);
      } else if (path === `/api/v1/roles/${role.id}/dismiss/` && request.method === "POST") {
        dismisses.push(request.clone());
        ({ status, body } = dismiss);
      } else status = 404;
      return new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return { applies, dismisses };
}

function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Feed />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("lists open roles and highlights my skills", async () => {
  mockApi();
  renderFeed();

  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
  expect(await screen.findByText("(you have this skill)")).toBeInTheDocument();
});

test("says so when there are no open roles", async () => {
  mockApi({ roles: [] });
  renderFeed();
  expect(await screen.findByText("No open roles right now. Check back later.")).toBeInTheDocument();
});

test("applies with a note", async () => {
  document.cookie = "csrftoken=test-token";
  const { applies } = mockApi({
    apply: { status: 201, body: { id: 9, role: 7, note: "I know DRF", status: "pending" } },
  });
  renderFeed();

  fireEvent.change(await screen.findByLabelText("Note to the owner (optional)"), {
    target: { value: "  I know DRF " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(await screen.findByText("Applied. The owner will see your note.")).toBeInTheDocument();
  expect(applies).toHaveLength(1);
  expect(await applies[0].json()).toEqual({ role: 7, note: "I know DRF" });
  expect(applies[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("tells me when the role was just filled", async () => {
  mockApi({ apply: { status: 409, body: { detail: "This role was just filled." } } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("This role was just filled.");
  expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
});

test("keeps the form when applying fails for another reason", async () => {
  mockApi({ apply: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't apply. Please try again.");
  expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
});

test("passing takes the card out of my feed", async () => {
  document.cookie = "csrftoken=test-token";
  const { dismisses } = mockApi();
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Pass" }));

  expect(await screen.findByText("No open roles right now. Check back later.")).toBeInTheDocument();
  expect(dismisses).toHaveLength(1);
  expect(dismisses[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("keeps the card and says so when passing fails", async () => {
  mockApi({ dismiss: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Pass" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pass. Please try again.");
  expect(screen.getByRole("article", { name: "Backend dev" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pass" })).toBeEnabled();
});
