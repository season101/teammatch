import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import TeamsPage from "@/app/(app)/teams/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/teams",
  useRouter: () => ({ replace: vi.fn() }),
}));

const team = {
  id: 3,
  project: { id: 4, title: "Bulldog Bites" },
  term: { name: "Fall 2026", end_date: "2026-12-12" },
  members: [
    { display_name: "Marco Rossi", role: "Owner" },
    { display_name: "", role: "Backend developer" },
  ],
  moderators: ["Dr. Lee"],
  formed_at: "2026-10-24T18:00:00Z",
  seen_at: "2026-10-30T12:00:00Z",
};

function renderPage(myTeam: typeof team | null, cache: Record<string, unknown> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], { id: 1, email: "sam@latech.edu" });
  client.setQueryData(["my-team"], myTeam);
  for (const [key, data] of Object.entries(cache)) client.setQueryData([key], data);
  render(
    <QueryClientProvider client={client}>
      <TeamsPage />
    </QueryClientProvider>,
  );
}

test("shows my team's project, term end and members with their roles", () => {
  renderPage(team);

  expect(screen.getByRole("heading", { name: "Bulldog Bites" })).toBeInTheDocument();
  expect(screen.getByText("Locked · Fall 2026")).toBeInTheDocument();
  expect(screen.getByText(/until Dec 12/)).toBeInTheDocument();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "MRMarco RossiOwner",
    "?Unnamed memberBackend developer",
  ]);
});

test("links to the team's chat", () => {
  renderPage(team);

  expect(screen.getByRole("link", { name: "Open team chat" })).toHaveAttribute(
    "href",
    "/teams/3/chat",
  );
});

test("without a team it says when one shows up", () => {
  renderPage(null);

  expect(
    screen.getByText("Your team shows up here once every role is filled. Team chat opens then."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

test("names the team's moderators under the lineup", () => {
  renderPage(team);

  expect(screen.getByText("Moderated by Dr. Lee")).toBeInTheDocument();
});

test("a moderator sees the projects they moderate, with chat once the team forms", () => {
  const { id, members, formed_at } = team;
  renderPage(null, {
    "my-profile": { role: "moderator" },
    "moderated-projects": [
      {
        id: 4,
        title: "Bulldog Bites",
        status: "locked",
        term: team.term,
        moderators: ["Dr. Lee"],
        team: { id, members, formed_at },
      },
      { id: 9, title: "Thesis Tracker", status: "open", term: team.term, moderators: [], team: null },
    ],
  });

  expect(screen.getByRole("heading", { name: "Bulldog Bites" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Team for Bulldog Bites" })).toHaveTextContent(
    "Marco Rossi · Owner",
  );
  expect(
    screen.getByRole("link", { name: "Open team chat for Bulldog Bites" }),
  ).toHaveAttribute("href", "/teams/3/chat");
  expect(screen.getByRole("link", { name: "View Thesis Tracker" })).toHaveAttribute(
    "href",
    "/projects/9",
  );
  expect(
    screen.queryByRole("link", { name: "Open team chat for Thesis Tracker" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("No team yet")).not.toBeInTheDocument();
});

test("a moderator on no project is told an admin assigns them", () => {
  renderPage(null, { "my-profile": { role: "moderator" }, "moderated-projects": [] });

  expect(
    screen.getByText("Projects show up here once an admin puts you on them."),
  ).toBeInTheDocument();
});

test("without a team, the button points at the nearest step to one", () => {
  renderPage(null, { "my-summary": { offers: 1, applicants_waiting: 2 } });
  expect(screen.getByRole("link", { name: "See your offer" })).toHaveAttribute("href", "/applications");
});

test("an owner with applicants waiting is sent to Review", () => {
  renderPage(null, { "my-summary": { offers: 0, applicants_waiting: 2 } });
  expect(screen.getByRole("link", { name: "Review applicants" })).toHaveAttribute("href", "/applicants");
});

test("a committed student is sent to their commitment, not the closed deck", () => {
  renderPage(null, { "my-summary": { offers: 0, applicants_waiting: 0, deck: "committed" } });
  expect(screen.getByRole("link", { name: "See your commitment" })).toHaveAttribute("href", "/applications");
});
