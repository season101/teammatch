import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";
import { Feed } from "./feed";

// Exit animations finish at once, so a decided card leaves the DOM straight away.
MotionGlobalConfig.skipAnimations = true;

const role = {
  id: 7,
  title: "Backend dev",
  description: "APIs",
  created_at: "2026-10-16T00:00:00Z",
  project: { id: 3, title: "TeamMatch", pitch: "Find a team", owner_name: "Olive" },
  required_skills: [{ id: 1, name: "Python", slug: "python" }],
};
const nextRole = {
  ...role,
  id: 8,
  title: "Frontend dev",
  project: { ...role.project, id: 4, title: "CampusEats", pitch: "Late-night food" },
  required_skills: [{ id: 2, name: "React", slug: "react" }],
};

const profile = {
  id: 1,
  display_name: "Sam",
  bio: "",
  major: "CS",
  email: "sam@latech.edu",
  skills: [{ id: 1, name: "Python", slug: "python" }],
};

// Answers by method and path; records the apply and pass requests. Like the real
// feed, a role I applied to or passed on doesn't come back on the next fetch.
function mockApi({
  roles = [role],
  apply = { status: 201, body: {} as unknown },
  dismiss = { status: 204, body: null as unknown },
} = {}) {
  let open = [...roles];
  const applies: Request[] = [];
  const dismisses: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const dismissId = Number(path.match(/^\/api\/v1\/roles\/(\d+)\/dismiss\/$/)?.[1]);
      let status = 200;
      let body: unknown = {};
      if (path === "/api/v1/feed/") body = { next: null, previous: null, results: open };
      else if (path === "/api/v1/me/profile/") body = profile;
      else if (path === "/api/v1/applications/" && request.method === "POST") {
        applies.push(request.clone());
        ({ status, body } = apply);
        if (status === 201) {
          const { role: id } = await request.json();
          open = open.filter((r) => r.id !== id);
        }
      } else if (dismissId && request.method === "POST") {
        dismisses.push(request.clone());
        ({ status, body } = dismiss);
        if (status === 204) open = open.filter((r) => r.id !== dismissId);
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

// Motion tracks the pointer on the window once a drag starts on the card.
function drag(card: Element, dx: number) {
  fireEvent.pointerDown(card, { isPrimary: true, button: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0 });
  for (const x of [dx / 2, dx]) {
    fireEvent.pointerMove(window, { isPrimary: true, buttons: 1, clientX: x, clientY: 0, pageX: x, pageY: 0 });
  }
  fireEvent.pointerUp(window, { isPrimary: true, clientX: dx, clientY: 0, pageX: dx, pageY: 0 });
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("shows one card at a time, with my skills marked", async () => {
  mockApi({ roles: [role, nextRole] });
  renderFeed();

  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
  // The next card sits under the top one, hidden from screen readers.
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText("Frontend dev")).toBeInTheDocument();
  expect(await screen.findByText("(you have this skill)")).toBeInTheDocument();
});

test("says I'm all caught up when there are no open roles", async () => {
  mockApi({ roles: [] });
  renderFeed();
  expect(await screen.findByRole("heading", { name: "You're all caught up" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse projects" })).toHaveAttribute("href", "/projects");
});

test("applying with a note sends it and moves to the next card", async () => {
  document.cookie = "csrftoken=test-token";
  const { applies } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  fireEvent.change(await screen.findByLabelText("Note to the owner (optional)"), {
    target: { value: "  I know DRF " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(screen.queryByText("Backend dev")).not.toBeInTheDocument();
  // The note was for the card that left.
  expect(screen.getByLabelText("Note to the owner (optional)")).toHaveValue("");
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Applied to Backend dev at TeamMatch."),
  );
  expect(applies).toHaveLength(1);
  expect(await applies[0].json()).toEqual({ role: 7, note: "I know DRF" });
  expect(applies[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("passing the last card leaves me all caught up", async () => {
  document.cookie = "csrftoken=test-token";
  const { dismisses } = mockApi();
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Pass" }));

  expect(await screen.findByRole("heading", { name: "You're all caught up" })).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Passed on Backend dev. You've seen every role for now.",
    ),
  );
  expect(dismisses).toHaveLength(1);
  expect(new URL(dismisses[0].url).pathname).toBe("/api/v1/roles/7/dismiss/");
  expect(dismisses[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("dragging right applies", async () => {
  const { applies, dismisses } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  drag(await screen.findByText("Find a team"), 200);

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(applies).toHaveLength(1);
  expect(await applies[0].json()).toEqual({ role: 7, note: "" });
  expect(dismisses).toHaveLength(0);
});

test("dragging left passes", async () => {
  const { applies, dismisses } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  drag(await screen.findByText("Find a team"), -200);

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(dismisses).toHaveLength(1);
  expect(applies).toHaveLength(0);
});

// Otherwise the click that ends the drag would pass on the card too.
test("a drag that starts on a button doesn't swipe", async () => {
  const { applies } = mockApi();
  renderFeed();

  drag(await screen.findByRole("button", { name: "Pass" }), 200);
  // Motion ends a drag on a later frame.
  await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

  expect(applies).toHaveLength(0);
  expect(screen.getByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});

test("a filled role stays gone and I'm told why", async () => {
  mockApi({ apply: { status: 409, body: { detail: "This role was just filled." } } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("This role was just filled.");
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});

test("the card and my note come back when applying fails", async () => {
  mockApi({ apply: { status: 500, body: {} } });
  renderFeed();

  fireEvent.change(await screen.findByLabelText("Note to the owner (optional)"), {
    target: { value: "I know DRF" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't apply. Please try again.");
  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
  expect(screen.getByLabelText("Note to the owner (optional)")).toHaveValue("I know DRF");
});

test("the card comes back when passing fails", async () => {
  mockApi({ dismiss: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Pass" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pass. Please try again.");
  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});
