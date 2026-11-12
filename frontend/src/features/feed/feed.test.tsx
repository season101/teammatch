import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";
import { setShortcutsEnabled } from "@/features/shell/preferences";
import { Feed } from "./feed";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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

const myTeam = {
  id: 5,
  project: { id: 4, title: "CampusEats" },
  term: { name: "Fall 2026", end_date: "2026-11-20" },
  members: [],
  formed_at: "2026-11-01T00:00:00Z",
  seen_at: "2026-11-01T00:00:00Z",
};

// Answers by method and path; records the apply, pass and reset requests. Like the
// real feed, a role I applied to or passed on doesn't come back on the next fetch,
// and a reset brings the passed ones back. Apply and pass answer once `wait` settles.
function mockApi({
  roles = [role],
  apply = { status: 201, body: {} as unknown },
  dismiss = { status: 204, body: null as unknown },
  reset = { status: 204, body: null as unknown },
  wait = Promise.resolve(),
  team = (): unknown => null,
} = {}) {
  let open = [...roles];
  let passed: typeof roles = [];
  const applies: Request[] = [];
  const dismisses: Request[] = [];
  const resets: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const dismissId = Number(path.match(/^\/api\/v1\/roles\/(\d+)\/dismiss\/$/)?.[1]);
      let status = 200;
      let body: unknown = {};
      if (path === "/api/v1/feed/") body = { next: null, previous: null, results: open };
      else if (path === "/api/v1/me/profile/") body = profile;
      else if (path === "/api/v1/teams/mine/") body = { team: team() };
      else if (path === "/api/v1/applications/" && request.method === "POST") {
        applies.push(request.clone());
        await wait;
        ({ status, body } = apply);
        if (status === 201) {
          const { role: id } = await request.json();
          open = open.filter((r) => r.id !== id);
        }
      } else if (dismissId && request.method === "POST") {
        dismisses.push(request.clone());
        await wait;
        ({ status, body } = dismiss);
        if (status === 204) {
          passed = [...passed, ...open.filter((r) => r.id === dismissId)];
          open = open.filter((r) => r.id !== dismissId);
        }
      } else if (path === "/api/v1/feed/reset/" && request.method === "POST") {
        resets.push(request.clone());
        ({ status, body } = reset);
        if (status === 204) [open, passed] = [[...open, ...passed], []];
      } else status = 404;
      return new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return { applies, dismisses, resets };
}

function renderFeed(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
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

const applyButton = (name = "Apply to Backend dev on TeamMatch") =>
  screen.findByRole("button", { name });
const passButton = (name = "Pass on Backend dev") => screen.findByRole("button", { name });
const deck = () => screen.findByRole("group", { name: "Deck of open roles" });

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  document.cookie = "csrftoken=; max-age=0";
  localStorage.clear();
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

test("applying moves to the next card, with no note", async () => {
  document.cookie = "csrftoken=test-token";
  const { applies } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  fireEvent.click(await applyButton());

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(screen.queryByText("Backend dev")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Applied to Backend dev at TeamMatch."),
  );
  expect(applies).toHaveLength(1);
  expect(await applies[0].json()).toEqual({ role: 7 });
  expect(applies[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("an applied role leaves the cached feed, so it doesn't come back", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockApi({ roles: [role, nextRole] });
  renderFeed(client);

  fireEvent.click(await applyButton());

  await waitFor(() =>
    expect(client.getQueryData<{ id: number }[]>(["feed"])?.map((r) => r.id)).toEqual([8]),
  );
});

test("tapping the card, ↑ or Enter opens the role on its project page", async () => {
  mockApi({ roles: [role, nextRole] });
  renderFeed();

  fireEvent.click(await screen.findByText("Find a team"));
  const stack = await deck();
  fireEvent.keyDown(stack, { key: "ArrowUp" });
  fireEvent.keyDown(stack, { key: "Enter" });

  expect(push.mock.calls).toEqual([
    ["/projects/3?role=7"],
    ["/projects/3?role=7"],
    ["/projects/3?role=7"],
  ]);
  // Enter on a button presses the button instead.
  fireEvent.keyDown(await passButton(), { key: "Enter" });
  expect(push).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("link", { name: "View details for Backend dev" })).toHaveAttribute(
    "href",
    "/projects/3?role=7",
  );
});

test("passing the last card leaves me all caught up", async () => {
  document.cookie = "csrftoken=test-token";
  const { dismisses } = mockApi();
  renderFeed();

  fireEvent.click(await passButton());

  expect(await screen.findByRole("heading", { name: "You're all caught up" })).toBeInTheDocument();
  // Nothing left to decide on.
  expect(screen.queryByRole("button", { name: /^Pass on/ })).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Passed on Backend dev. You've seen every role for now.",
    ),
  );
  expect(dismisses).toHaveLength(1);
  expect(new URL(dismisses[0].url).pathname).toBe("/api/v1/roles/7/dismiss/");
  expect(dismisses[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("after passing every role I can see the passed ones again", async () => {
  document.cookie = "csrftoken=test-token";
  const { resets } = mockApi();
  renderFeed();

  fireEvent.click(await passButton());
  fireEvent.click(await screen.findByRole("button", { name: "Show passed roles again" }));

  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
  // The arrow keys work straight away.
  expect(await deck()).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Your passed roles are back.");
  expect(resets).toHaveLength(1);
  expect(resets[0].headers.get("X-CSRFToken")).toBe("test-token");
});

test("I'm told when there are no passed roles to bring back", async () => {
  mockApi({ roles: [] });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Show passed roles again" }));

  expect(await within(await deck()).findByText("No passed roles to bring back.")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No passed roles to bring back.");
  expect(screen.queryByRole("button", { name: "Show passed roles again" })).not.toBeInTheDocument();
});

test("passing on a role that shows up later brings the button back", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockApi({ roles: [] });
  renderFeed(client);
  fireEvent.click(await screen.findByRole("button", { name: "Show passed roles again" }));
  await within(await deck()).findByText("No passed roles to bring back.");

  // A new project shows up the next time the feed loads.
  act(() => client.setQueryData(["feed"], [role]));
  fireEvent.click(await passButton());

  expect(await screen.findByRole("button", { name: "Show passed roles again" })).toBeInTheDocument();
});

test("I'm told when showing passed roles again fails", async () => {
  mockApi({ roles: [], reset: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await screen.findByRole("button", { name: "Show passed roles again" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn't show passed roles. Please try again.",
  );
});

test("dragging right applies", async () => {
  const { applies, dismisses } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  drag(await screen.findByText("Find a team"), 200);

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(applies).toHaveLength(1);
  expect(await applies[0].json()).toEqual({ role: 7 });
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

// Otherwise pressing View details could swipe the card away.
test("a drag that starts on View details doesn't swipe", async () => {
  const { applies } = mockApi();
  renderFeed();

  drag(await screen.findByRole("link", { name: "View details for Backend dev" }), 200);
  // Motion ends a drag on a later frame.
  await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

  expect(applies).toHaveLength(0);
  expect(screen.getByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});

test("a filled role stays gone and I'm told why", async () => {
  mockApi({ apply: { status: 409, body: { detail: "This role was just filled." } } });
  renderFeed();

  fireEvent.click(await applyButton());

  expect(await screen.findByRole("alert")).toHaveTextContent("This role was just filled.");
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});

test("the card comes back when applying fails", async () => {
  mockApi({ apply: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await applyButton());

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't apply. Please try again.");
  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});

test("the card comes back when passing fails", async () => {
  mockApi({ dismiss: { status: 500, body: {} } });
  renderFeed();

  fireEvent.click(await passButton());

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pass. Please try again.");
  expect(await screen.findByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});

test("→ applies and ← passes when the deck has focus", async () => {
  const third = { ...nextRole, id: 9, title: "Designer" };
  const { applies, dismisses } = mockApi({ roles: [role, nextRole, third] });
  renderFeed();

  const stack = await deck();
  stack.focus();
  fireEvent.keyDown(stack, { key: "ArrowRight" });
  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  await waitFor(() => expect(applies).toHaveLength(1));
  expect(await applies[0].json()).toEqual({ role: 7 });

  // Still on the deck, so the next key works too.
  await waitFor(() => expect(stack).toHaveFocus());
  fireEvent.keyDown(stack, { key: "ArrowLeft" });
  expect(await screen.findByRole("article", { name: "Designer" })).toBeInTheDocument();
  expect(dismisses).toHaveLength(1);
  expect(new URL(dismisses[0].url).pathname).toBe("/api/v1/roles/8/dismiss/");
});

test("arrow keys on a deck button move focus back to the deck", async () => {
  const { dismisses } = mockApi({ roles: [role, nextRole] });
  renderFeed();

  const pass = await passButton();
  pass.focus();
  fireEvent.keyDown(pass, { key: "ArrowLeft" });

  expect(await screen.findByRole("article", { name: "Frontend dev" })).toBeInTheDocument();
  expect(await deck()).toHaveFocus();
  expect(dismisses).toHaveLength(1);
});

test("modified or held arrow keys don't decide", async () => {
  const { applies, dismisses } = mockApi();
  renderFeed();

  // Alt+← is the browser's Back, and a held key repeats.
  fireEvent.keyDown(await deck(), { key: "ArrowLeft", altKey: true });
  fireEvent.keyDown(await deck(), { key: "ArrowRight", repeat: true });
  fireEvent.keyDown(await deck(), { key: "ArrowRight", shiftKey: true });

  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(applies).toHaveLength(0);
  expect(dismisses).toHaveLength(0);
  expect(screen.getByRole("article", { name: "Backend dev" })).toBeInTheDocument();
});

test("arrow keys do nothing with keyboard shortcuts turned off", async () => {
  setShortcutsEnabled(false);
  const { applies, dismisses } = mockApi();
  renderFeed();

  const stack = await deck();
  expect(stack).not.toHaveAttribute("aria-keyshortcuts");
  fireEvent.keyDown(stack, { key: "ArrowRight" });
  fireEvent.keyDown(stack, { key: "ArrowLeft" });
  fireEvent.keyDown(stack, { key: "ArrowUp" });

  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(applies).toHaveLength(0);
  expect(dismisses).toHaveLength(0);
  expect(push).not.toHaveBeenCalled();
  // The buttons still work.
  fireEvent.click(await passButton());
  await waitFor(() => expect(dismisses).toHaveLength(1));
});

test("the next card can be decided while the last one is still sending", async () => {
  let answer = () => {};
  const wait = new Promise<void>((resolve) => (answer = resolve));
  const third = { ...nextRole, id: 9, title: "Designer" };
  const { applies, dismisses } = mockApi({ roles: [role, nextRole, third], wait });
  renderFeed();

  fireEvent.click(await applyButton());
  const pass = await passButton("Pass on Frontend dev");
  expect(pass).not.toHaveAttribute("aria-disabled");
  fireEvent.click(pass);

  expect(await screen.findByRole("article", { name: "Designer" })).toBeInTheDocument();
  expect(applies).toHaveLength(1);
  expect(dismisses).toHaveLength(1);
  answer();
  await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Designer" })).toBeInTheDocument();
});

test("a benched member sees their team instead of the deck", async () => {
  mockApi({ team: () => myTeam });
  renderFeed();

  expect(
    await screen.findByRole("heading", { name: "You're on CampusEats" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("You're on a team until Nov 20. Your other applications were withdrawn."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open team chat" })).toHaveAttribute(
    "href",
    "/teams/5/chat",
  );
  expect(screen.queryByRole("group", { name: "Deck of open roles" })).not.toBeInTheDocument();
});

test("applying after my team locked shows the benched state and reloads my applications", async () => {
  let seated: unknown = null;
  mockApi({
    apply: {
      status: 403,
      body: { detail: "You're on a team this term, so you can't apply until it ends." },
    },
    team: () => seated,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["my-applications"], []);
  renderFeed(client);
  const button = await applyButton();

  seated = myTeam;
  fireEvent.click(button);

  expect(
    await screen.findByRole("heading", { name: "You're on CampusEats" }),
  ).toBeInTheDocument();
  // The lock liked one of them and withdrew the rest, so the sidebar list is stale.
  expect(client.getQueryState(["my-applications"])?.isInvalidated).toBe(true);
});
