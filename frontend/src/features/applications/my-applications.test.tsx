import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { MyApplications } from "./my-applications";

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

function application(id: number, title: string, status: string) {
  return {
    id,
    role: {
      id,
      title,
      project: {
        id: 4,
        title: "Lab Equipment Checkout",
        pitch: "",
        owner_name: "Priya",
      },
    },
    note: "",
    status,
    created_at: "2026-10-19T12:00:00Z",
    updated_at: "2026-10-21T12:00:00Z",
  };
}

const ALL = [
  application(1, "Full-stack developer", "pending"),
  application(2, "Mobile developer", "liked"),
  application(3, "Backend developer", "passed"),
  application(4, "Project manager", "withdrawn"),
];

type Reply = { status: number; body: unknown };

// A tiny fake API. Records every request; a successful withdraw changes the list.
function mockApi({
  applications = ALL as unknown[],
  withdraw = { status: 200, body: { ...ALL[0], status: "withdrawn" } } as Reply,
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
      else if (path === "/api/v1/applications/1/withdraw/") {
        reply = withdraw;
        if (withdraw.status === 200) list = [withdraw.body, ...list.slice(1)];
      }
      return new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return requests;
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyApplications />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("lists each application with its project, status chip and what happens next", async () => {
  mockApi();
  renderPage();

  const rows = within(await screen.findByRole("tabpanel")).getAllByRole(
    "listitem",
  );
  expect(rows).toHaveLength(4);
  expect(rows[0]).toHaveTextContent("Full-stack developer");
  expect(rows[0]).toHaveTextContent("Lab Equipment Checkout");
  expect(rows[0]).toHaveTextContent("Pending");
  expect(rows[0]).toHaveTextContent("Waiting on Priya · applied Oct 19");
  expect(rows[1]).toHaveTextContent("Filled");
  expect(rows[1]).toHaveTextContent("You're in.");
  expect(rows[2]).toHaveTextContent("Priya picked someone else.");
  expect(rows[3]).toHaveTextContent("You withdrew on Oct 21.");

  // Only pending applications can be withdrawn (BR-11).
  expect(
    screen.getAllByRole("button", { name: /^Withdraw from/ }),
  ).toHaveLength(1);
  expect(
    within(rows[0]).getByRole("button", {
      name: "Withdraw from Full-stack developer",
    }),
  ).toBeInTheDocument();
});

test("the Closed filter shows passed and withdrawn applications", async () => {
  mockApi();
  renderPage();

  fireEvent.click(await screen.findByRole("tab", { name: "Closed" }));
  const rows = within(screen.getByRole("tabpanel")).getAllByRole("listitem");
  expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual([
    "Backend developer",
    "Project manager",
  ]);
});

test("withdraw asks first, and Keep my application changes nothing", async () => {
  const requests = mockApi();
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Withdraw from Full-stack developer",
    }),
  );
  const dialog = screen.getByRole("dialog", {
    name: "Withdraw your application?",
  });
  expect(dialog).toHaveTextContent("You can't apply to it again.");
  expect(
    within(dialog).getByRole("button", { name: "Keep my application" }),
  ).toHaveFocus();

  fireEvent.click(
    within(dialog).getByRole("button", { name: "Keep my application" }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(
    0,
  );
});

test("confirming withdraws with the CSRF token and the row turns Withdrawn", async () => {
  document.cookie = "csrftoken=abc123";
  const requests = mockApi();
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Withdraw from Full-stack developer",
    }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Withdraw",
    }),
  );

  // The hidden filter panels hold the same rows, so look in the visible one.
  await waitFor(() =>
    expect(
      within(screen.getByRole("tabpanel")).getAllByText(/^You withdrew on/),
    ).toHaveLength(2),
  );
  const post = requests.find((request) => request.method === "POST");
  expect(new URL(post!.url).pathname).toBe("/api/v1/applications/1/withdraw/");
  expect(post!.headers.get("X-CSRFToken")).toBe("abc123");
  expect(
    screen.queryByRole("button", { name: /^Withdraw from/ }),
  ).not.toBeInTheDocument();
});

test("shows the server's message when it's no longer pending", async () => {
  mockApi({
    withdraw: {
      status: 409,
      body: { detail: "This application is no longer pending." },
    },
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Withdraw from Full-stack developer",
    }),
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
