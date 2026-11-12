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
  {
    projects = [project] as unknown[],
    team = null as unknown,
    summary = undefined as unknown,
    children = <p>Stage</p> as ReactNode,
  } = {},
) {
  nav.pathname = pathname;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], { id: 1, email: "sam@latech.edu" });
  client.setQueryData(["my-projects"], projects);
  client.setQueryData(["my-applications"], []);
  client.setQueryData(["my-team"], team);
  if (summary) client.setQueryData(["my-summary"], summary);
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
  const [topBar, sideNav, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });

  expect(bottomBar).toHaveClass("sm:hidden");
  expect(topBar.parentElement).toHaveClass("hidden", "sm:flex", "lg:hidden");
  expect(sideNav.closest("aside")).toHaveClass("hidden", "lg:flex");
  expect(within(sideNav).getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Discover",
    "Projects",
    "Review",
    "Teams",
    "Profile",
    "Settings",
  ]);
  expect(within(bottomBar).getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Discover",
    "Projects",
    "Review",
    "Teams",
    "Me",
  ]);
});

test("marks the current place in every layout", () => {
  renderShell("/applicants");
  const [, sideNav, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });

  expect(within(bottomBar).getByRole("link", { name: "Review" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(bottomBar).getByRole("link", { name: "Discover" })).not.toHaveAttribute(
    "aria-current",
  );
  expect(within(sideNav).getByRole("link", { name: "Review" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Review is only for students who own a project", () => {
  renderShell("/feed", { projects: [{ ...project, status: "archived" }] });
  expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Teams" })).toHaveLength(3);
});

test("arrow keys move focus along the tabs and the side nav, wrapping at the ends", () => {
  renderShell("/feed");
  const [, sideNav, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });
  const discover = within(bottomBar).getByRole("link", { name: "Discover" });

  discover.focus();
  fireEvent.keyDown(discover, { key: "ArrowRight" });
  expect(within(bottomBar).getByRole("link", { name: "Projects" })).toHaveFocus();

  fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveFocus();

  within(sideNav).getByRole("link", { name: "Settings" }).focus();
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(within(sideNav).getByRole("link", { name: "Discover" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(within(sideNav).getByRole("link", { name: "Projects" })).toHaveFocus();
});

test("the deck shows its keyboard legend, and Hide collapses it", () => {
  renderShell("/feed");
  const legend = screen.getByRole("complementary", { name: "Keyboard shortcuts" });

  expect(legend).toHaveTextContent("Details");
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

test("the logo goes to Discover, and Profile and Settings are their own rows on desktop", () => {
  renderShell("/profile");
  const [, sideNav, bottomBar] = screen.getAllByRole("navigation", { name: "Main" });

  expect(screen.getByRole("link", { name: "TeamMatch, go to Discover" })).toHaveAttribute(
    "href",
    "/feed",
  );
  expect(within(sideNav).getByRole("link", { name: "Profile" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(within(sideNav).getByRole("link", { name: "Settings" })).not.toHaveAttribute(
    "aria-current",
  );

  // Phones and tablets have no side nav, so Me opens Settings, which links to Profile.
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveAttribute("href", "/settings");
  expect(within(bottomBar).getByRole("link", { name: "Me" })).toHaveAttribute("aria-current", "page");
});

test("badges count my offers and the applicants waiting, in every layout", () => {
  renderShell("/feed", { summary: { offers: 2, applicants_waiting: 3, deck: "open" } });

  for (const nav of screen.getAllByRole("navigation", { name: "Main" })) {
    expect(within(nav).getByRole("link", { name: /^Discover, 2 offers$/ })).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: /^Review, 3 applicants waiting$/ }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Projects" })).toBeInTheDocument();
  }
});

test("no badge at zero or before the counts load", () => {
  renderShell("/feed", { summary: { offers: 0, applicants_waiting: 0, deck: "open" } });
  expect(screen.getAllByRole("link", { name: "Discover" })).toHaveLength(3);
});

test("an owner with an open project can still start a draft, with a note why it can't publish", () => {
  renderShell("/applicants");
  expect(screen.getByRole("link", { name: "New project" })).toHaveAttribute("href", "/projects/new");
  expect(screen.getByText(/a new one stays a draft/)).toBeInTheDocument();
});

test("no note when the owner only has drafts", () => {
  renderShell("/applicants", { projects: [{ ...project, status: "draft" }] });
  expect(screen.getByRole("link", { name: "New project" })).toBeInTheDocument();
  expect(screen.queryByText(/a new one stays a draft/)).toBeNull();
});

test("the sidebar's Teams tab links to my team once I have one", () => {
  renderShell("/teams", {
    team: { id: 3, project: { id: 4, title: "Bulldog Bites" }, members: [], seen_at: "x" },
  });
  const sidebar = screen.getAllByRole("navigation", { name: "Main" })[1].closest("aside")!;

  expect(within(sidebar).getByRole("link", { name: "Bulldog Bites" })).toHaveAttribute(
    "href",
    "/teams",
  );
  expect(within(sidebar).queryByText(/once every role is filled/)).not.toBeInTheDocument();
});
