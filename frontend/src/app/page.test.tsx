import { render, screen, within } from "@testing-library/react";
import Home from "./page";

test("leads with the hero, one way to sign up and the four steps", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Swipe on roles, not people." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/signup",
  );
  for (const link of screen.getAllByRole("link", { name: "Sign in" })) {
    expect(link).toHaveAttribute("href", "/login");
  }
  const steps = within(screen.getByRole("region", { name: "How it works" }));
  expect(steps.getAllByRole("listitem")).toHaveLength(4);
});
