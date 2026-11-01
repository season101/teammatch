import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { profileStrength, ProfileTabs } from "./profile-tabs";

const SKILLS = [
  { id: 1, name: "Django", slug: "django" },
  { id: 2, name: "Python", slug: "python" },
];

const PROFILE = {
  id: 7,
  display_name: "Sam Student",
  bio: "I like building things.",
  major: "Computer Science",
  skills: [SKILLS[1]],
  email: "sam@latech.edu",
};

const EMPTY = { ...PROFILE, bio: "", major: "", skills: [] };

function renderTabs() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const body = request.url.includes("/api/v1/skills/") ? SKILLS : PROFILE;
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfileTabs />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

test.each([
  ["empty", EMPTY, 0],
  ["major only", { ...EMPTY, major: "CS" }, 20],
  ["skills only", { ...EMPTY, skills: SKILLS }, 40],
  ["bio only", { ...EMPTY, bio: "Hi" }, 20],
  ["everything", PROFILE, 80],
])("strength for %s is %i", (_, profile, expected) => {
  expect(profileStrength(profile)).toBe(expected);
});

test("a full profile tops out at 80% until avatars exist", async () => {
  renderTabs();
  const meter = await screen.findByRole("meter", { name: "Profile strength" });
  expect(meter).toHaveAttribute("aria-valuenow", "80");
  expect(screen.getByText("80%")).toBeInTheDocument();
});

test("Preview shows the card owners see; Edit shows the form", async () => {
  renderTabs();
  const preview = await screen.findByRole("tab", { name: "Preview" });
  const edit = screen.getByRole("tab", { name: "Edit" });

  expect(preview).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getByRole("heading", { name: "Sam Student" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("listitem")).toHaveTextContent("Python");

  fireEvent.click(edit);

  expect(edit).toHaveAttribute("aria-selected", "true");
  expect(await screen.findByLabelText("Display name")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Sam Student" }),
  ).not.toBeInTheDocument();
});
