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
      if (path === "/api/v1/projects/mine/") reply = { status: 200, body: projects };
      else if (path === "/api/v1/roles/2/applications/")
        reply = { status: 200, body: { next: null, previous: null, results: pending } };
      else if (path === "/api/v1/roles/1/applications/")
        reply = { status: 200, body: { next: null, previous: null, results: [] } };
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

test("lists each role's pending applicants with name, major, skills and note", async () => {
  mockApi();
  renderPage();

  const frontend = await screen.findByRole("region", { name: /Frontend developer/ });
  expect(await within(frontend).findByText("Sam Candidate")).toBeInTheDocument();
  expect(within(frontend).getByText("Cyber Engineering")).toBeInTheDocument();
  expect(within(frontend).getByRole("list", { name: "Sam Candidate's skills" })).toHaveTextContent(
    "React",
  );
  expect(within(frontend).getByText("I know React")).toBeInTheDocument();
  expect(within(frontend).getByText("1 pending")).toBeInTheDocument();

  const backend = screen.getByRole("region", { name: /Backend developer/ });
  expect(await within(backend).findByText("No pending applicants.")).toBeInTheDocument();
});

test("liking sends the like with the CSRF token and drops the applicant", async () => {
  document.cookie = "csrftoken=test-token";
  const requests = mockApi();
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Like Sam Candidate" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Liked Sam Candidate.");
  const like = requests.find((r) => r.method === "POST");
  expect(new URL(like!.url).pathname).toBe("/api/v1/applications/9/like/");
  expect(like!.headers.get("X-CSRFToken")).toBe("test-token");
  const frontend = screen.getByRole("region", { name: /Frontend developer/ });
  expect(await within(frontend).findByText("No pending applicants.")).toBeInTheDocument();
});

test("passing sends the pass", async () => {
  const requests = mockApi({ decision: { status: 200, body: { ...sam, status: "passed" } } });
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Pass on Sam Candidate" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Passed on Sam Candidate.");
  const pass = requests.find((r) => r.method === "POST");
  expect(new URL(pass!.url).pathname).toBe("/api/v1/applications/9/pass/");
});

test("shows the API's message when the application was already decided", async () => {
  mockApi({
    decision: { status: 409, body: { detail: "This application is no longer pending." } },
  });
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Like Sam Candidate" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This application is no longer pending.",
  );
});

test("a draft project asks to be published instead of loading applicants", async () => {
  const requests = mockApi({ projects: [{ ...openProject, status: "draft" }] });
  renderPage();

  expect(await screen.findByText("Publish this project to get applicants.")).toBeInTheDocument();
  expect(requests.some((r) => r.url.includes("/applications/"))).toBe(false);
});

test("says so when I own no projects", async () => {
  mockApi({ projects: [] });
  renderPage();

  expect(await screen.findByText(/You don.t own any projects yet/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/projects/new");
});
