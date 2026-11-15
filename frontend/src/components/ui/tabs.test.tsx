import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Tabs } from "./tabs";

const tabs = [
  { id: "applications", label: "Applications", panel: "3 pending" },
  { id: "teams", label: "Teams", panel: "No teams yet" },
];

test("shows the first tab's panel until another tab is picked", () => {
  render(<Tabs label="Your activity" tabs={tabs} />);
  const teams = screen.getByRole("tab", { name: "Teams" });

  expect(screen.getByRole("tabpanel")).toHaveTextContent("3 pending");
  expect(teams).toHaveAttribute("aria-selected", "false");

  fireEvent.click(teams);

  expect(teams).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("No teams yet");
});

test("remember reopens the last tab, unless it's gone or storage is blocked", () => {
  const { unmount } = render(<Tabs label="Your activity" tabs={tabs} remember="activity" />);
  fireEvent.click(screen.getByRole("tab", { name: "Teams" }));
  unmount();

  const again = render(<Tabs label="Your activity" tabs={tabs} remember="activity" />);
  expect(screen.getByRole("tab", { name: "Teams" })).toHaveAttribute("aria-selected", "true");
  again.unmount();

  // A role that was deleted since: the first tab.
  render(<Tabs label="Your activity" tabs={tabs.slice(0, 1)} remember="activity" />);
  expect(screen.getByRole("tab", { name: "Applications" })).toHaveAttribute("aria-selected", "true");
  cleanup();

  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  render(<Tabs label="Your activity" tabs={tabs} remember="activity" />);
  expect(screen.getByRole("tab", { name: "Applications" })).toHaveAttribute("aria-selected", "true");
  vi.restoreAllMocks();
});

test("arrow keys move the selection and focus, wrapping at the ends", () => {
  render(<Tabs label="Your activity" tabs={tabs} />);
  const applications = screen.getByRole("tab", { name: "Applications" });
  const teams = screen.getByRole("tab", { name: "Teams" });

  fireEvent.keyDown(applications, { key: "ArrowRight" });
  expect(teams).toHaveAttribute("aria-selected", "true");
  expect(teams).toHaveFocus();

  fireEvent.keyDown(teams, { key: "ArrowRight" });
  expect(applications).toHaveAttribute("aria-selected", "true");
  expect(applications).toHaveFocus();
});
