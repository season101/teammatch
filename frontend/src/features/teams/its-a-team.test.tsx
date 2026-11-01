import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, vi } from "vitest";
import { RoleQueue } from "@/features/review/role-queue";
import { TeamCelebration } from "./its-a-team";

MotionGlobalConfig.skipAnimations = true;

// jsdom has no modal dialog behaviour: showModal() opens it, Esc (close()) fires "close".
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const team = {
  id: 3,
  project: { id: 4, title: "Bulldog Bites" },
  term: { name: "Fall 2026", end_date: "2026-12-12" },
  members: [
    { display_name: "Marco Rossi", role: "Owner" },
    { display_name: "Ava", role: "Backend developer" },
  ],
  seen_at: null as string | null,
};

const sam = {
  id: 9,
  applicant: { id: 3, display_name: "Sam", bio: "", major: "", skills: [] },
  note: "",
  status: "pending",
  created_at: "2026-10-16T00:00:00Z",
};

// GET /teams/mine/ answers `myTeam()`, so a test can change it between requests.
function mockApi(myTeam: () => typeof team | null) {
  const posts: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (request.method === "POST") posts.push(request.clone());
      let body: unknown = {};
      if (path === "/api/v1/teams/mine/") body = { team: myTeam() };
      else if (path === "/api/v1/roles/2/applications/")
        body = { next: null, previous: null, results: [sam] };
      else if (path === "/api/v1/applications/9/like/")
        body = { ...sam, status: "liked", team_locked: true, team_id: team.id };
      else if (path === "/api/v1/teams/3/seen/")
        return new Response(null, { status: 204 });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  const seen = () =>
    posts
      .map((r) => new URL(r.url).pathname)
      .filter((path) => path.endsWith("/seen/"));
  return { posts, seen };
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("shows once when my seen_at is empty, and marks it seen", async () => {
  document.cookie = "csrftoken=test-token";
  const { posts, seen } = mockApi(() => team);
  renderWithClient(<TeamCelebration />);

  const dialog = await screen.findByRole("dialog", { name: "It's a Team!" });
  expect(
    within(dialog).getByText("Bulldog Bites · Fall 2026"),
  ).toBeInTheDocument();
  expect(within(dialog).getByText(/until Dec 12/)).toBeInTheDocument();
  expect(
    within(dialog)
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual(["MRMarco RossiOwner", "AAvaBackend developer"]);
  const cta = within(dialog).getByRole("link", { name: "Open team chat" });
  expect(cta).toHaveFocus();
  expect(cta).toHaveAttribute("href", "/teams");
  expect(
    within(dialog).getByRole("link", { name: "See the team" }),
  ).toHaveAttribute("href", "/teams");
  await waitFor(() => expect(seen()).toEqual(["/api/v1/teams/3/seen/"]));
  expect(posts[0].headers.get("X-CSRFToken")).toBe("test-token");

  // Esc closes it, and it doesn't come back.
  (dialog as HTMLDialogElement).close();
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(seen()).toHaveLength(1);
});

test("doesn't show once I've seen it, or when I have no team", async () => {
  for (const myTeam of [{ ...team, seen_at: "2026-10-30T12:00:00Z" }, null]) {
    const { seen } = mockApi(() => myTeam);
    const client = renderWithClient(<TeamCelebration />);

    await waitFor(() =>
      expect(client.getQueryState(["my-team"])?.status).toBe("success"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(seen()).toEqual([]);
  }
});

test("the owner sees it right after the like that locks the team", async () => {
  let locked = false;
  const { seen } = mockApi(() => (locked ? team : null));
  renderWithClient(
    <>
      <RoleQueue
        role={{ id: 2, title: "Frontend developer", status: "open" }}
        projectId={4}
        rolesToGo={0}
        onFilled={() => {}}
      />
      <TeamCelebration />
    </>,
  );

  const like = await screen.findByRole("button", { name: "Like Sam" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  locked = true;
  fireEvent.click(like);

  expect(
    await screen.findByRole("dialog", { name: "It's a Team!" }),
  ).toBeInTheDocument();
  await waitFor(() => expect(seen()).toEqual(["/api/v1/teams/3/seen/"]));
});
