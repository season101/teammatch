import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { FinishSetup } from "./finish-setup";

const AGREED = "2026-11-11T10:00:00Z";

// Everything comes from the cache, so nothing hits the network.
function renderCard({
  rules = null as string | null,
  skills = [] as unknown[],
  applications = [] as unknown[],
  user = { id: 1, email: "sam@latech.edu" } as unknown,
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], user);
  client.setQueryData(["my-profile"], { rules_accepted_at: rules, skills });
  client.setQueryData(["my-applications"], applications);
  render(
    <QueryClientProvider client={client}>
      <FinishSetup />
    </QueryClientProvider>,
  );
}

test("nothing done: the rules are the link, the rest plain text", () => {
  renderCard();

  expect(screen.getByRole("heading", { name: "Finish setup" })).toBeVisible();
  expect(screen.getByText("0 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: "Agree to team rules" }),
  ).toHaveAttribute("href", "/welcome/rules");
  expect(screen.getByText("Add your skills")).toBeInTheDocument();
});

test("done items are struck through, and the first one left is the link", () => {
  renderCard({ rules: AGREED });

  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  expect(screen.getByText(/Agree to team rules/)).toHaveClass(
    "line-through",
    "text-muted",
  );
  expect(screen.getByText(/Agree to team rules/)).toHaveTextContent("(done)");
  expect(screen.getByRole("link", { name: "Add your skills" })).toHaveAttribute(
    "href",
    "/welcome/skills",
  );
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

test("with skills picked, applying is what's left", () => {
  renderCard({ rules: AGREED, skills: [{ id: 2 }] });

  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Apply to your first role" }),
  ).toHaveAttribute("href", "/feed");
});

test("gone once all three are done", () => {
  renderCard({ rules: AGREED, skills: [{ id: 2 }], applications: [{ id: 5 }] });
  expect(screen.queryByText("Finish setup")).not.toBeInTheDocument();
});

test("nothing for a signed-out visitor", () => {
  renderCard({ user: null });
  expect(screen.queryByText("Finish setup")).not.toBeInTheDocument();
});
