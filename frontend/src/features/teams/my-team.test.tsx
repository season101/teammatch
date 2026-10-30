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
  seen_at: "2026-10-30T12:00:00Z",
};

function renderPage(myTeam: typeof team | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], { id: 1, email: "sam@latech.edu" });
  client.setQueryData(["my-team"], myTeam);
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

test("without a team it says when one shows up", () => {
  renderPage(null);

  expect(
    screen.getByText("Your team shows up here once every role is filled. Team chat opens then."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
