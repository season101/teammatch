import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ProfileForm } from "./profile-form";

const SKILLS = [
  { id: 1, name: "Django", slug: "django" },
  { id: 2, name: "Python", slug: "python" },
  { id: 3, name: "React", slug: "react" },
];

const PROFILE = {
  id: 7,
  display_name: "Sam",
  bio: "I like building things.",
  major: "Computer Science",
  skills: [SKILLS[1]],
  email: "sam@latech.edu",
};

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfileForm />
    </QueryClientProvider>,
  );
}

// GETs return the profile and the skill list; a PATCH gets `patchReply`.
function mockApi(patchReply: { status: number; body: unknown }) {
  const patches: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      let status = 200;
      let body: unknown = PROFILE;
      if (request.method === "PATCH") {
        patches.push(request);
        ({ status, body } = patchReply);
      } else if (request.url.includes("/api/v1/skills/")) {
        body = SKILLS;
      }
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return patches;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("shows the saved profile", async () => {
  mockApi({ status: 200, body: PROFILE });
  renderForm();
  expect(await screen.findByLabelText("Display name")).toHaveValue("Sam");
  expect(screen.getByLabelText("Major")).toHaveValue("Computer Science");
  expect(screen.getByLabelText("Bio")).toHaveValue("I like building things.");
  expect(
    screen.getByRole("button", { name: "Remove Python" }),
  ).toBeInTheDocument();
});

test("saves name, major, bio and skills", async () => {
  document.cookie = "csrftoken=test-token";
  const patches = mockApi({
    status: 200,
    body: { ...PROFILE, display_name: "Sam Lee", skills: [SKILLS[0]] },
  });
  renderForm();

  fireEvent.change(await screen.findByLabelText("Display name"), {
    target: { value: "Sam Lee" },
  });
  fireEvent.click(screen.getByRole("button", { name: "+ Django" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Python" }));
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

  expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  expect(patches).toHaveLength(1);
  expect(patches[0].url).toContain("/api/v1/me/profile/");
  expect(patches[0].headers.get("X-CSRFToken")).toBe("test-token");
  expect(await patches[0].json()).toEqual({
    display_name: "Sam Lee",
    bio: "I like building things.",
    major: "Computer Science",
    skill_ids: [1],
  });
});

test("shows the server's message next to the field", async () => {
  mockApi({
    status: 400,
    body: { bio: ["Ensure this field has no more than 500 characters."] },
  });
  renderForm();
  fireEvent.click(await screen.findByRole("button", { name: "Save profile" }));
  expect(
    await screen.findByText(
      "Ensure this field has no more than 500 characters.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("Profile saved.")).not.toBeInTheDocument();
});
