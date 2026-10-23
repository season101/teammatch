import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import SettingsPage from "@/app/(app)/settings/page";
import { AppShell } from "./app-shell";
import { applySavedTheme } from "./theme-script";

const nav = vi.hoisted(() => ({ pathname: "/feed" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn() }),
}));

const project = { id: 4, title: "Bulldog Bites", status: "open", roles: [], created_at: "" };

// Session and projects come from the cache, so nothing hits the network.
function renderShell(
  pathname: string,
  { projects = [project] as unknown[], children = <p>Stage</p> as ReactNode } = {},
) {
  nav.pathname = pathname;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], { id: 1, email: "sam@latech.edu" });
  client.setQueryData(["my-projects"], projects);
  render(
    <QueryClientProvider client={client}>
      <AppShell>{children}</AppShell>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("bottom bar on phones, top bar on tablets, sidebar on desktop", () => {
  renderShell("/feed");
  const [topBar, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });

  expect(bottomBar).toHaveClass("sm:hidden");
  expect(topBar.parentElement).toHaveClass("hidden", "sm:flex", "lg:hidden");
  expect(screen.getByRole("navigation", { name: "Modes" }).closest("aside")).toHaveClass(
    "hidden",
    "lg:flex",
    "lg:w-80",
  );
  expect(within(bottomBar).getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Discover",
    "Projects",
    "Review",
    "Teams",
    "Me",
  ]);
});

test("marks the current tab and mode", () => {
  renderShell("/applicants");
  const [, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });
  const modes = screen.getByRole("navigation", { name: "Modes" });

  expect(within(bottomBar).getByRole("link", { name: "Review" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(bottomBar).getByRole("link", { name: "Discover" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(within(modes).getByRole("link", { name: "Projects" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Review is only for students who own a project", () => {
  renderShell("/feed", { projects: [{ ...project, status: "archived" }] });
  expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Teams" })).toHaveLength(2);
});

test("arrow keys move focus along the tabs and the modes, wrapping at the ends", () => {
  renderShell("/feed");
  const [, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });
  const discover = within(bottomBar).getByRole("link", { name: "Discover" });

  discover.focus();
  fireEvent.keyDown(discover, { key: "ArrowRight" });
  expect(within(bottomBar).getByRole("link", { name: "Projects" })).toHaveFocus();

  fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveFocus();

  const modes = screen.getByRole("navigation", { name: "Modes" });
  within(modes).getByRole("link", { name: "Settings" }).focus();
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(within(modes).getByRole("link", { name: "Discover" })).toHaveFocus();
});

test("the deck shows its keyboard legend, and Hide collapses it", () => {
  renderShell("/feed");
  const legend = screen.getByRole("complementary", { name: "Keyboard shortcuts" });

  expect(legend).toHaveTextContent("Apply with note");
  fireEvent.click(within(legend).getByRole("button", { name: "Hide" }));
  expect(screen.queryByRole("complementary", { name: "Keyboard shortcuts" })).toBeNull();
});

test("the review queue has its own keys", () => {
  renderShell("/applicants");
  expect(screen.getByRole("complementary", { name: "Keyboard shortcuts" })).toHaveTextContent(
    "Like",
  );
});

test("screens without keys show no legend", () => {
  renderShell("/projects");
  expect(screen.queryByRole("complementary", { name: "Keyboard shortcuts" })).toBeNull();
});

test("Settings → Keyboard shortcuts turns the legend off and on", () => {
  renderShell("/feed", { children: <SettingsPage /> });
  const toggle = screen.getByRole("switch", { name: /Keyboard shortcuts/ });

  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  expect(toggle).not.toBeChecked();
  expect(screen.queryByRole("complementary", { name: "Keyboard shortcuts" })).toBeNull();
  expect(localStorage.getItem("teammatch:keyboard-shortcuts")).toBe("off");

  fireEvent.click(toggle);
  expect(screen.getByRole("complementary", { name: "Keyboard shortcuts" })).toBeInTheDocument();
});

test("Settings → Theme switches the theme and remembers it", () => {
  renderShell("/settings", { children: <SettingsPage /> });
  const root = document.documentElement;

  expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: "Light" }));
  expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
  expect(root.dataset.theme).toBe("light");
  expect(localStorage.getItem("teammatch:theme")).toBe("light");

  fireEvent.click(screen.getByRole("radio", { name: "System" }));
  expect(root).not.toHaveAttribute("data-theme");
  expect(localStorage.getItem("teammatch:theme")).toBeNull();
});

test("the saved theme applies before the first paint", () => {
  localStorage.setItem("teammatch:theme", "dark");
  applySavedTheme();
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("the avatar goes to Discover, and Profile sits under Settings", () => {
  renderShell("/profile");
  const modes = screen.getByRole("navigation", { name: "Modes" });

  expect(screen.getByRole("link", { name: "You, go to Discover" })).toHaveAttribute("href", "/feed");
  expect(within(modes).getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");

  // Phones and tablets have no sidebar, so Me opens Settings, which links to Profile.
  const [, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveAttribute("href", "/settings");
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveAttribute("aria-current", "page");
});
