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
  avatar_url: null as string | null,
  github_url: "",
  linkedin_url: "",
  email: "sam@latech.edu",
  rules_accepted_at: null,
};

const EMPTY = { ...PROFILE, bio: "", major: "", skills: [] };
const PHOTO = "/api/v1/profiles/7/avatar/?v=1";
const FULL = {
  ...PROFILE,
  avatar_url: PHOTO,
  github_url: "https://github.com/sam",
  linkedin_url: "https://www.linkedin.com/in/sam/",
};

function renderTabs(profile: typeof PROFILE = PROFILE) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const body = request.url.includes("/api/v1/skills/") ? SKILLS : profile;
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
  ["photo only", { ...EMPTY, avatar_url: PHOTO }, 10],
  ["GitHub only", { ...EMPTY, github_url: "https://github.com/sam" }, 5],
  ["LinkedIn only", { ...EMPTY, linkedin_url: "https://linkedin.com/in/sam" }, 5],
  ["everything but a photo and links", PROFILE, 80],
  ["everything", FULL, 100],
])("strength for %s is %i", (_, profile, expected) => {
  expect(profileStrength(profile)).toBe(expected);
});

test("Preview shows GitHub and LinkedIn as cards that open in a new tab", async () => {
  renderTabs(FULL);

  const github = await screen.findByRole("link", { name: /GitHub/ });
  expect(github).toHaveAttribute("href", "https://github.com/sam");
  expect(github).toHaveAttribute("target", "_blank");
  expect(github).toHaveAttribute("rel", "noopener noreferrer");
  expect(github).toHaveTextContent("github.com/sam");
  expect(github).toHaveAccessibleName(/opens in a new tab/);
  expect(screen.getByRole("link", { name: /LinkedIn/ })).toHaveTextContent(
    "linkedin.com/in/sam",
  );
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
});

test("no link cards without links", async () => {
  renderTabs();
  await screen.findByRole("heading", { name: "Sam Student" });
  expect(screen.queryByRole("list", { name: "Links" })).not.toBeInTheDocument();
});

test("a profile without a photo or links stops at 80%", async () => {
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
