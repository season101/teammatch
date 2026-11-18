import { render, screen, within } from "@testing-library/react";
import Home from "./page";

test("leads with the hero, one way in and the four steps", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Swipe on roles, not people." }),
  ).toBeInTheDocument();
  // Log in and Get started open the same screen: Log in or sign up.
  for (const link of screen.getAllByRole("link", { name: /Log in|Get started/ })) {
    expect(link).toHaveAttribute("href", "/login");
  }
  const steps = within(screen.getByRole("region", { name: "How it works" }));
  expect(steps.getAllByRole("listitem")).toHaveLength(4);
});
