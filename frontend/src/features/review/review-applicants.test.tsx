import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ReviewApplicants } from "./review-applicants";

const sam = {
  id: 9,
  applicant: {
    id: 3,
    display_name: "Sam Candidate",
    bio: "",
    major: "Cyber Engineering",
    skills: [{ id: 5, name: "React", slug: "react" }],
  },
  note: "I know React",
  status: "pending",
  created_at: "2026-10-16T00:00:00Z",
};

const openProject = {
  id: 4,
  title: "Campus Ride Share",
  status: "open",
  created_at: "2026-10-16T00:00:00Z",
  roles: [
    { id: 2, title: "Frontend developer", status: "open" },
    { id: 1, title: "Backend developer", status: "open" },
  ],
};

// Role 2 asks for React (Sam has it) and Python (Sam does not).
const projectDetail = {
  id: 4,
  title: "Campus Ride Share",
  pitch: "",
  status: "open",
  owner: 1,
  owner_name: "Owner",
  created_at: "2026-10-16T00:00:00Z",
  roles: [
    {
      id: 2,
      project: 4,
      title: "Frontend developer",
      description: "",
      status: "open",
      required_skills: [5, 6],
      created_at: "2026-10-16T00:00:00Z",
      filled_by_name: "",
    },
    {
      id: 1,
      project: 4,
      title: "Backend developer",
      description: "",
      status: "open",
      required_skills: [],
      created_at: "2026-10-16T00:00:00Z",
      filled_by_name: "",
    },
  ],
};

type Reply = { status: number; body: unknown };

// A tiny fake API: role 2 has Sam until a decision succeeds. Records every request.
function mockApi({
  projects = [openProject] as unknown[],
  decision = { status: 200, body: { ...sam, status: "liked" } } as Reply,
} = {}) {
  const requests: Request[] = [];
  let pending = [sam];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request.clone());
      const path = new URL(request.url).pathname;
      let reply: Reply = { status: 404, body: {} };
      if (path === "/api/v1/projects/mine/")
        reply = { status: 200, body: projects };
      else if (path === "/api/v1/projects/4/")
        reply = { status: 200, body: projectDetail };
      else if (path === "/api/v1/roles/2/applications/")
        reply = {
          status: 200,
          body: { next: null, previous: null, results: pending },
        };
      else if (path === "/api/v1/roles/1/applications/")
        reply = {
          status: 200,
          body: { next: null, previous: null, results: [] },
        };
      else if (/^\/api\/v1\/applications\/9\/(like|pass)\/$/.test(path)) {
        reply = decision;
        if (decision.status === 200) pending = [];
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
      <ReviewApplicants />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("shows a tab per role with its count, and the first applicant as a card", async () => {
  mockApi();
  renderPage();

  expect(
    await screen.findByRole("tab", { name: /Frontend developer\s*1/ }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("tab", { name: /Backend developer\s*0/ }),
  ).toBeInTheDocument();

  const card = await screen.findByRole("article", {
    name: "Applicant Sam Candidate for Frontend developer",
  });
  expect(within(card).getByText("Cyber Engineering")).toBeInTheDocument();
  expect(
    within(card).getByRole("list", { name: "Sam Candidate's skills" }),
  ).toHaveTextContent("React");
  expect(within(card).getByText("I know React")).toBeInTheDocument();
  expect(
    screen.getByText("Frontend developer · 1 of 1 waiting"),
  ).toBeInTheDocument();
});

test("a role with no one waiting says so", async () => {
  mockApi();
  renderPage();

  fireEvent.click(
    await screen.findByRole("tab", { name: /Backend developer/ }),
  );

  expect(
    await screen.findByText("No one's waiting for Backend developer."),
  ).toBeInTheDocument();
});

test("a filled role shows a tick and does not load applicants", async () => {
  const requests = mockApi({
    projects: [
      {
        ...openProject,
        roles: [
          { id: 2, title: "Frontend developer", status: "open" },
          { id: 1, title: "Backend developer", status: "filled" },
        ],
      },
    ],
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("tab", { name: /Backend developer/ }),
  );

  expect(
    await screen.findByText("Backend developer is filled."),
  ).toBeInTheDocument();
  expect(requests.some((r) => r.url.includes("/roles/1/applications/"))).toBe(
    false,
  );
});

test("liking sends the like with the CSRF token and moves on", async () => {
  document.cookie = "csrftoken=test-token";
  const requests = mockApi();
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Like Sam Candidate" }),
  );

  expect(
    await screen.findByText("Frontend developer filled"),
  ).toBeInTheDocument();
  expect(screen.getByText("1 role to go.")).toBeInTheDocument();
  const like = requests.find((r) => r.method === "POST");
  expect(new URL(like!.url).pathname).toBe("/api/v1/applications/9/like/");
  expect(like!.headers.get("X-CSRFToken")).toBe("test-token");
  expect(
    await screen.findByText("No one's waiting for Frontend developer."),
  ).toBeInTheDocument();
});

test("passing sends the pass", async () => {
  const requests = mockApi({
    decision: { status: 200, body: { ...sam, status: "passed" } },
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Pass on Sam Candidate" }),
  );

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Passed on Sam Candidate.",
  );
  const pass = requests.find((r) => r.method === "POST");
  expect(new URL(pass!.url).pathname).toBe("/api/v1/applications/9/pass/");
});

test("shows the API's message when the application was already decided", async () => {
  mockApi({
    decision: {
      status: 409,
      body: { detail: "This application is no longer pending." },
    },
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Like Sam Candidate" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This application is no longer pending.",
  );
});

test("a draft project is not listed, and the page says there is nothing to review", async () => {
  const requests = mockApi({ projects: [{ ...openProject, status: "draft" }] });
  renderPage();

  expect(
    await screen.findByText(/No open project to review yet/),
  ).toBeInTheDocument();
  expect(screen.queryByText("Campus Ride Share")).not.toBeInTheDocument();
  expect(requests.some((r) => r.url.includes("/applications/"))).toBe(false);
});

test("says so when I own no projects", async () => {
  mockApi({ projects: [] });
  renderPage();

  expect(
    await screen.findByText(/You don.t own any projects yet/),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute(
    "href",
    "/projects/new",
  );
});

test("the right arrow likes the first applicant", async () => {
  const requests = mockApi();
  renderPage();
  await screen.findByRole("article", { name: /Applicant Sam Candidate/ });

  fireEvent.keyDown(document.body, { key: "ArrowRight" });

  expect(
    await screen.findByText("Frontend developer filled"),
  ).toBeInTheDocument();
  const like = requests.find((r) => r.method === "POST");
  expect(new URL(like!.url).pathname).toBe("/api/v1/applications/9/like/");
});

test("the left arrow passes the first applicant", async () => {
  const requests = mockApi({
    decision: { status: 200, body: { ...sam, status: "passed" } },
  });
  renderPage();
  await screen.findByRole("article", { name: /Applicant Sam Candidate/ });

  fireEvent.keyDown(document.body, { key: "ArrowLeft" });

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Passed on Sam Candidate.",
  );
  const pass = requests.find((r) => r.method === "POST");
  expect(new URL(pass!.url).pathname).toBe("/api/v1/applications/9/pass/");
});

test("arrow keys on a role tab switch tabs instead of deciding", async () => {
  const requests = mockApi();
  renderPage();
  const frontend = await screen.findByRole("tab", {
    name: /Frontend developer/,
  });
  await screen.findByRole("article", { name: /Applicant Sam Candidate/ });

  fireEvent.keyDown(frontend, { key: "ArrowRight" });

  expect(
    await screen.findByRole("tab", {
      name: /Backend developer/,
      selected: true,
    }),
  ).toBeInTheDocument();
  expect(requests.some((r) => r.method === "POST")).toBe(false);
});

test("keys only act on the role you are looking at", async () => {
  const requests = mockApi();
  renderPage();
  fireEvent.click(
    await screen.findByRole("tab", { name: /Backend developer/ }),
  );
  await screen.findByText("No one's waiting for Backend developer.");

  fireEvent.keyDown(document.body, { key: "ArrowRight" });

  expect(requests.some((r) => r.method === "POST")).toBe(false);
});

test("an empty role offers Edit role", async () => {
  mockApi();
  renderPage();

  fireEvent.click(
    await screen.findByRole("tab", { name: /Backend developer/ }),
  );

  expect(
    await screen.findByRole("link", { name: "Edit role" }),
  ).toHaveAttribute("href", "/projects/4");
});

test("a like that fills the last role says the team is locked", async () => {
  mockApi({
    decision: {
      status: 200,
      body: { ...sam, status: "liked", team_locked: true, team_id: 3 },
    },
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Like Sam Candidate" }),
  );

  expect(
    await screen.findByText("That was the last role. Your team is locked."),
  ).toBeInTheDocument();
});

test("the card shows how many required skills the applicant has, matched ones first", async () => {
  mockApi();
  renderPage();

  const card = await screen.findByRole("article", {
    name: /Applicant Sam Candidate/,
  });
  expect(
    await within(card).findByText("Has 1 of 2 required skills"),
  ).toBeInTheDocument();
  expect(within(card).getByText("React").closest("li")).toHaveTextContent(
    "(matched)",
  );
});
