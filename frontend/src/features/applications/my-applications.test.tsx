import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { MyApplications, StatusChip } from "./my-applications";

// jsdom has no modal dialog behaviour, so stand in for what browsers do.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function application(
  id: number,
  title: string,
  status: string,
  project = { id: 6, title: "Lab Notes", owner_name: "Priya" },
) {
  return {
    id,
    role: { id, title, project: { pitch: `${project.title} pitch`, ...project } },
    note: "",
    status,
    created_at: "2026-10-19T12:00:00Z",
    updated_at: "2026-10-21T12:00:00Z",
  };
}

const campusEats = { id: 4, title: "Campus Eats", owner_name: "Olive" };
const OFFERS = [
  application(1, "Frontend developer", "liked", campusEats),
  application(2, "Data analyst", "liked", {
    id: 5,
    title: "Course Compass",
    owner_name: "",
  }),
];
const REST = [
  application(3, "UI designer", "pending"),
  application(4, "Backend developer", "passed"),
  application(5, "Project manager", "withdrawn"),
  application(6, "Tester", "declined"),
];
const ALL = [...OFFERS, ...REST];

// What the commit does on the server: the seat is mine, everything still open closes.
const AFTER_COMMIT = ALL.map((a) =>
  a.id === 1
    ? { ...a, status: "committed", updated_at: "2026-11-02T09:00:00.100Z" }
    : a.status === "liked" || a.status === "pending"
      ? { ...a, status: "withdrawn", updated_at: "2026-11-02T09:00:00.200Z" }
      : a,
);

type Reply = { status: number; body: unknown };
const conflict = (detail: string, code: string): Reply => ({
  status: 409,
  body: { detail, code },
});

// A tiny fake API. Records every request; `after` is the list once a write succeeds
// (or fails with a 409, when the server had already moved on).
function mockApi({
  applications = ALL as unknown[],
  after = undefined as unknown[] | undefined,
  write = { status: 200, body: {} } as Reply,
} = {}) {
  const requests: Request[] = [];
  let list = applications;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request.clone());
      const path = new URL(request.url).pathname;
      let reply: Reply = { status: 404, body: {} };
      if (path === "/api/v1/applications/mine/")
        reply = {
          status: 200,
          body: { next: null, previous: null, results: list },
        };
      else if (path === "/api/v1/projects/mine/")
        reply = {
          status: 200,
          body: [
            { id: 7, title: "Old Idea", status: "archived", roles: [] },
            { id: 8, title: "Trail Finder", status: "open", roles: [] },
          ],
        };
      else if (path === "/api/v1/projects/4/")
        reply = {
          status: 200,
          body: {
            roles: [
              {
                id: 1,
                title: "Frontend developer",
                status: list === AFTER_COMMIT ? "filled" : "open",
              },
              { id: 11, title: "Backend developer", status: "filled" },
              { id: 12, title: "UI designer", status: "open" },
            ],
          },
        };
      else if (request.method === "POST") {
        reply = write;
        list = after ?? applications;
      }
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  const posts = () =>
    requests
      .filter((request) => request.method === "POST")
      .map((request) => new URL(request.url).pathname);
  return { requests, posts };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["my-summary"], { offers: 2 });
  client.setQueryData(["my-team"], null);
  render(
    <QueryClientProvider client={client}>
      <MyApplications />
    </QueryClientProvider>,
  );
  return client;
}

const panel = () => screen.getByRole("tabpanel");
const titles = () =>
  within(panel())
    .getAllByRole("listitem")
    .map((row) => row.querySelector("p")?.textContent);
const commitButton = () =>
  screen.findByRole("button", {
    name: "Commit to Frontend developer on Campus Eats",
  });
const declineButton = () =>
  screen.findByRole("button", {
    name: "Decline Frontend developer on Campus Eats",
  });

async function confirmCommit() {
  fireEvent.click(await commitButton());
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Commit to Campus Eats",
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("opens on Offers when there are offers, with one card per offer", async () => {
  mockApi();
  renderPage();

  await commitButton();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    "Offers 2",
    "Pending",
    "Committed",
    "Closed",
  ]);
  expect(screen.getByRole("tab", { name: "Offers 2" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(panel()).toHaveTextContent(
    "Commit to one. Your other offers close when you do.",
  );

  const cards = within(panel()).getAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(cards[0]).toHaveAccessibleName("Frontend developer on Campus Eats");
  expect(cards[0]).toHaveTextContent("Campus Eats pitch");
  // Team progress comes from the project, once it loads.
  await waitFor(() =>
    expect(cards[0]).toHaveTextContent("Olive liked you · 1 of 3 roles filled"),
  );
  expect(
    within(cards[0]).getByRole("img", { name: "1 of 3 roles filled" }),
  ).toBeInTheDocument();
  expect(cards[1]).toHaveTextContent("The owner liked you");
  // Each offer has its own named pair of buttons.
  expect(await declineButton()).toBeInTheDocument();
  expect(
    within(cards[1]).getByRole("button", {
      name: "Commit to Data analyst on Course Compass",
    }),
  ).toBeInTheDocument();
});

test("opens on Pending when there are no offers, and Closed holds the rest", async () => {
  mockApi({ applications: REST });
  renderPage();

  expect(await screen.findByRole("tab", { name: "Pending" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Offers" })).toBeInTheDocument();
  expect(titles()).toEqual(["UI designer"]);
  expect(panel()).toHaveTextContent("Waiting on Priya · applied Oct 19");
  // Only pending applications can be withdrawn (BR-11).
  expect(
    screen.getAllByRole("button", { name: /^Withdraw from/ }),
  ).toHaveLength(1);

  fireEvent.click(screen.getByRole("tab", { name: "Closed" }));
  expect(titles()).toEqual(["Backend developer", "Project manager", "Tester"]);
  expect(panel()).toHaveTextContent("Priya picked someone else.");
  expect(panel()).toHaveTextContent("You withdrew on Oct 21.");
  expect(panel()).toHaveTextContent("You declined on Oct 21.");
});

test("a liked application is an Offer, never Filled", () => {
  render(
    <>
      <StatusChip status="liked" />
      <StatusChip status="committed" />
      <StatusChip status="declined" />
    </>,
  );
  expect(screen.getByText("Offer")).toBeInTheDocument();
  expect(screen.getByText("Committed")).toBeInTheDocument();
  expect(screen.getByText("Closed")).toBeInTheDocument();
  expect(screen.queryByText("Filled")).not.toBeInTheDocument();
});

test("the final confirm says what closes and starts on Keep my options", async () => {
  const { posts } = mockApi();
  renderPage();

  fireEvent.click(await commitButton());
  const dialog = screen.getByRole("dialog", { name: "Commit to Campus Eats?" });
  expect(dialog).toHaveTextContent(
    "You take the Frontend developer seat. Your 1 other offer and 1 pending application close, and you can't undo this.",
  );
  // Enter must not commit straight away (DD-34).
  const keep = within(dialog).getByRole("button", { name: "Keep my options" });
  expect(keep).toHaveFocus();
  expect(
    within(dialog).getByRole("button", { name: "Commit to Campus Eats" }),
  ).not.toHaveFocus();

  fireEvent.click(keep);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(posts()).toEqual([]);
});

test("committing takes the seat and lands on Committed with what closed", async () => {
  document.cookie = "csrftoken=abc123";
  const { requests, posts } = mockApi({
    after: AFTER_COMMIT,
    write: {
      status: 200,
      body: { ...AFTER_COMMIT[0], team_locked: false, team_id: null },
    },
  });
  const client = renderPage();

  await confirmCommit();

  expect(
    await screen.findByRole("tab", { name: "Committed", selected: true }),
  ).toBeInTheDocument();
  expect(posts()).toEqual(["/api/v1/applications/1/commit/"]);
  expect(
    requests
      .find((request) => request.method === "POST")!
      .headers.get("X-CSRFToken"),
  ).toBe("abc123");

  const card = within(panel()).getByRole("article", {
    name: "Frontend developer on Campus Eats",
  });
  expect(card).toHaveTextContent(
    "You're in. Team chat opens when the last role fills.",
  );
  await waitFor(() => expect(card).toHaveTextContent("1 role left: UI designer"));
  expect(
    within(card).getByRole("img", { name: "2 of 3 roles filled" }),
  ).toBeInTheDocument();

  // My other offer and my pending application closed with it; the old withdrawal didn't.
  const closed = screen.getByRole("region", {
    name: "Closed when you committed",
  });
  expect(
    within(closed)
      .getAllByRole("listitem")
      .map((row) => row.querySelector("p")?.textContent),
  ).toEqual(["Data analyst", "UI designer"]);
  expect(screen.queryByRole("tab", { name: /^Offers \d/ })).not.toBeInTheDocument();

  // The nav badges and the deck read the summary. No team yet, so no celebration.
  expect(client.getQueryState(["my-summary"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["my-team"])?.isInvalidated).toBe(false);
});

test("a commit that locks the team reloads my team, so It's a Team! shows", async () => {
  mockApi({
    after: AFTER_COMMIT,
    write: {
      status: 200,
      body: { ...AFTER_COMMIT[0], team_locked: true, team_id: 3 },
    },
  });
  const client = renderPage();

  await confirmCommit();

  await waitFor(() =>
    expect(client.getQueryState(["my-team"])?.isInvalidated).toBe(true),
  );
});

test("owning an open project blocks the commit and links to that project", async () => {
  mockApi({
    // Told apart by the code, so the sentence can change.
    write: conflict("You still own an open project.", "owns_open_project"),
  });
  renderPage();

  await confirmCommit();

  const dialog = await screen.findByRole("dialog", {
    name: "Close your project first?",
  });
  expect(dialog).toHaveTextContent(
    "You own Trail Finder, which is still open. You can only hold one spot this term, so close it before you commit to Campus Eats.",
  );
  expect(
    within(dialog).getByRole("button", { name: "Keep this offer" }),
  ).toHaveFocus();
  expect(
    within(dialog).getByRole("link", { name: "Go to Trail Finder" }),
  ).toHaveAttribute("href", "/projects/8");
  // The dialog says it all, and the offer is still there.
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(await commitButton()).toBeInTheDocument();
});

test.each([
  ["role_not_open", "This role was just filled."],
  ["applicant_committed", "You already have a spot on a team this term."],
  ["offer_not_open", "This offer is no longer open."],
])("a %s conflict says why and reloads the list", async (code, detail) => {
  // The server had already closed the offer.
  mockApi({
    after: ALL.map((a) => (a.id === 1 ? { ...a, status: "passed" } : a)),
    write: conflict(detail, code),
  });
  const client = renderPage();

  await confirmCommit();

  expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("tab", { name: "Offers 1", selected: true }),
    ).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("tab", { name: "Closed" }));
  expect(titles()).toContain("Frontend developer");
  expect(client.getQueryState(["my-summary"])?.isInvalidated).toBe(true);
});

test("decline asks first with the safe choice in focus, then the offer moves to Closed", async () => {
  const { posts } = mockApi({
    after: ALL.map((a) => (a.id === 1 ? { ...a, status: "declined" } : a)),
    write: { status: 200, body: { ...ALL[0], status: "declined" } },
  });
  const client = renderPage();

  fireEvent.click(await declineButton());
  let dialog = screen.getByRole("dialog", { name: "Decline this offer?" });
  expect(dialog).toHaveTextContent(
    "Olive can offer Frontend developer to someone else. You can't get this offer back.",
  );
  const keep = within(dialog).getByRole("button", { name: "Keep this offer" });
  expect(keep).toHaveFocus();
  fireEvent.click(keep);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(posts()).toEqual([]);

  fireEvent.click(await declineButton());
  dialog = screen.getByRole("dialog", { name: "Decline this offer?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));

  expect(
    await screen.findByRole("tab", { name: "Offers 1" }),
  ).toBeInTheDocument();
  expect(posts()).toEqual(["/api/v1/applications/1/decline/"]);
  fireEvent.click(screen.getByRole("tab", { name: "Closed" }));
  expect(titles()).toContain("Frontend developer");
  expect(client.getQueryState(["my-summary"])?.isInvalidated).toBe(true);
});

test("withdraw asks first, and Keep my application changes nothing", async () => {
  const { posts } = mockApi({ applications: REST });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Withdraw from UI designer" }),
  );
  const dialog = screen.getByRole("dialog", {
    name: "Withdraw your application?",
  });
  expect(dialog).toHaveTextContent("You can't apply to it again.");
  const keep = within(dialog).getByRole("button", {
    name: "Keep my application",
  });
  expect(keep).toHaveFocus();

  fireEvent.click(keep);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(posts()).toEqual([]);
});

test("confirming withdraws with the CSRF token and the row moves to Closed", async () => {
  document.cookie = "csrftoken=abc123";
  const { requests, posts } = mockApi({
    applications: REST,
    after: REST.map((a) => (a.id === 3 ? { ...a, status: "withdrawn" } : a)),
    write: { status: 200, body: { ...REST[0], status: "withdrawn" } },
  });
  const client = renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Withdraw from UI designer" }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Withdraw",
    }),
  );

  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: /^Withdraw from/ }),
    ).not.toBeInTheDocument(),
  );
  expect(posts()).toEqual(["/api/v1/applications/3/withdraw/"]);
  expect(
    requests
      .find((request) => request.method === "POST")!
      .headers.get("X-CSRFToken"),
  ).toBe("abc123");
  fireEvent.click(screen.getByRole("tab", { name: "Closed" }));
  expect(titles()).toContain("UI designer");
  expect(client.getQueryState(["my-summary"])?.isInvalidated).toBe(true);
});

test("shows the server's message when it's no longer pending", async () => {
  mockApi({
    applications: REST,
    write: conflict("This application is no longer pending.", "application_not_pending"),
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Withdraw from UI designer" }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Withdraw",
    }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This application is no longer pending.",
  );
});

test("with no applications, points to Discover", async () => {
  mockApi({ applications: [] });
  renderPage();

  expect(
    await screen.findByRole("heading", { name: "No applications yet" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to Discover" })).toHaveAttribute(
    "href",
    "/feed",
  );
});
