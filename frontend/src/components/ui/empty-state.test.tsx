import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";
import { SkeletonRows } from "./skeleton";

test("says why it's empty and offers the next step", () => {
  render(
    <EmptyState title="No team yet" action={<a href="/feed">Go to Discover</a>}>
      Your team shows up here once every role is filled.
    </EmptyState>,
  );

  expect(screen.getByRole("heading", { name: "No team yet" })).toBeInTheDocument();
  expect(screen.getByText(/once every role is filled/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to Discover" })).toHaveAttribute("href", "/feed");
});

test("the icon is decoration, so screen readers skip it", () => {
  render(<EmptyState title="No team yet" icon={<svg data-testid="icon" />} />);
  expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
});

test("loading rows announce what's loading, not the blocks", () => {
  render(<SkeletonRows label="Loading your applications" rows={2} />);
  const status = screen.getByRole("status", { name: "Loading your applications" });
  expect(status.children).toHaveLength(2);
});
