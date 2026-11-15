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

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderForm(client = newClient()) {
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

// Saving would write Olive's details into Sam's profile.
test("waits for the server instead of filling in another user's cached profile", async () => {
  mockApi({ status: 200, body: PROFILE });
  const client = newClient();
  client.setQueryData(["skills"], SKILLS); // cached for good after the first visit
  client.setQueryData(["my-profile"], {
    ...PROFILE,
    id: 3,
    display_name: "Olive",
    major: "Biology",
    email: "olive@latech.edu",
  });
  renderForm(client);

  expect(await screen.findByLabelText("Display name")).toHaveValue("Sam");
  expect(screen.getByLabelText("Major")).toHaveValue("Computer Science");
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
    github_url: "",
    linkedin_url: "",
  });
});

test("sends GitHub and LinkedIn, and shows the server's message on a bad link", async () => {
  const patches = mockApi({
    status: 400,
    body: { github_url: ["Enter a link that starts with https://github.com/"] },
  });
  renderForm();

  fireEvent.change(await screen.findByLabelText("GitHub"), {
    target: { value: " https://gitlab.com/sam " },
  });
  fireEvent.change(screen.getByLabelText("LinkedIn"), {
    target: { value: "https://linkedin.com/in/sam" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter a link that starts with https://github.com/",
  );
  expect(screen.getByLabelText("GitHub")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("GitHub")).toHaveAccessibleDescription(
    /Enter a link that starts with https:\/\/github.com\//,
  );
  expect(await patches[0].json()).toMatchObject({
    github_url: "https://gitlab.com/sam",
    linkedin_url: "https://linkedin.com/in/sam",
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

// The two saves are separate requests; a PATCH reply sent before the upload finished
// still has no photo, and it mustn't take the new one away.
test("a Save profile reply that crossed a photo upload keeps the new photo", async () => {
  const PHOTO = "/api/v1/profiles/7/avatar/?v=new";
  const client = newClient();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      let body: unknown = { ...PROFILE, avatar_url: null };
      if (request.url.includes("/api/v1/skills/")) body = SKILLS;
      if (request.method === "POST") body = { ...PROFILE, avatar_url: PHOTO };
      if (request.method === "PATCH") body = { ...PROFILE, bio: "New bio", avatar_url: null };
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  renderForm(client);

  fireEvent.change(await screen.findByLabelText("Photo file"), {
    target: { files: [new File(["png"], "me.png", { type: "image/png" })] },
  });
  expect(await screen.findByText("Photo updated.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(await screen.findByText("Profile saved.")).toBeInTheDocument();

  expect(client.getQueryData(["my-profile"])).toMatchObject({
    bio: "New bio",
    avatar_url: PHOTO,
  });
  expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument();
});
