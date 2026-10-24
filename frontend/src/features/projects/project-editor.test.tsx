import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { ProjectEditor } from "./project-editor";

type Reply = [unknown, number];
type Call = { method: string; path: string; body: unknown };

// Answers every fetch by method and path, and records what was sent.
function mockApi(handler: (method: string, path: string) => Reply) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const body =
        request.method === "GET"
          ? undefined
          : await request.json().catch(() => undefined);
      calls.push({ method: request.method, path, body });
      const [payload, status] = handler(request.method, path);
      return new Response(status === 204 ? null : JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

function renderEditor(userId = 1) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectEditor projectId={7} userId={userId} />
    </QueryClientProvider>,
  );
}

const SKILLS = [
  { id: 1, name: "Django", slug: "django" },
  { id: 2, name: "React", slug: "react" },
];

const ROLE = {
  id: 3,
  project: 7,
  title: "Backend dev",
  description: "APIs",
  status: "open",
  required_skills: [1],
  created_at: "2026-10-17T00:00:00Z",
};

const project = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: "TeamMatch",
  pitch: "Find a team",
  status: "draft",
  owner: 1,
  owner_name: "Owner Name",
  roles: [],
  created_at: "2026-10-17T00:00:00Z",
  ...overrides,
});

// jsdom has no modal dialog behaviour, so stand in for what browsers do.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows the project, its roles and the skill names", async () => {
  mockApi((method, path) =>
    path === "/api/v1/skills/"
      ? [SKILLS, 200]
      : [project({ roles: [ROLE] }), 200],
  );
  renderEditor();
  expect(await screen.findByText("TeamMatch")).toBeInTheDocument();
  expect(screen.getByText("Backend dev")).toBeInTheDocument();
  const skills = screen.getByRole("list", { name: "Skills for Backend dev" });
  expect(within(skills).getByText("Django")).toBeInTheDocument();
});

test("asks for a title and at least one skill without calling the API", async () => {
  const calls = mockApi((method, path) =>
    path === "/api/v1/skills/" ? [SKILLS, 200] : [project(), 200],
  );
  renderEditor();
  fireEvent.click(await screen.findByRole("button", { name: "Add a role" }));
  fireEvent.click(screen.getByRole("button", { name: "Add role" }));
  expect(await screen.findByText("Title is required.")).toBeInTheDocument();
  expect(screen.getByText("Pick at least one skill.")).toBeInTheDocument();
  expect(calls.some((call) => call.method === "POST")).toBe(false);
});

test("adds a role with a title, description and skills", async () => {
  let roles: unknown[] = [];
  const calls = mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (method === "POST" && path === "/api/v1/projects/7/roles/") {
      roles = [ROLE];
      return [ROLE, 201];
    }
    return [project({ roles }), 200];
  });
  renderEditor();
  fireEvent.click(await screen.findByRole("button", { name: "Add a role" }));
  fireEvent.change(screen.getByLabelText("Role title"), {
    target: { value: "Backend dev" },
  });
  fireEvent.change(screen.getByLabelText("Role description"), {
    target: { value: "APIs" },
  });
  fireEvent.click(screen.getByRole("button", { name: "+ Django" }));
  fireEvent.click(screen.getByRole("button", { name: "Add role" }));

  expect(
    await screen.findByRole("list", { name: "Skills for Backend dev" }),
  ).toBeInTheDocument();
  const post = calls.find((call) => call.method === "POST");
  expect(post?.path).toBe("/api/v1/projects/7/roles/");
  expect(post?.body).toEqual({
    title: "Backend dev",
    description: "APIs",
    required_skills: [1],
  });
});

test("explains why a project without roles can't be published", async () => {
  mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (method === "POST")
      return [{ detail: "Add at least one role before publishing." }, 409];
    return [project(), 200];
  });
  renderEditor();
  fireEvent.click(
    await screen.findByRole("button", { name: "Publish project" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Add at least one role before publishing.",
  );
});

test("publishes a draft project", async () => {
  let status = "draft";
  mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (method === "POST") {
      status = "open";
      return [project({ status, roles: [ROLE] }), 200];
    }
    return [project({ status, roles: [ROLE] }), 200];
  });
  renderEditor();
  fireEvent.click(
    await screen.findByRole("button", { name: "Publish project" }),
  );
  expect(
    await screen.findByText(/now open for applications/i),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Publish project" }),
  ).not.toBeInTheDocument();
});

test("hides the editing buttons from people who don't own the project", async () => {
  mockApi((method, path) =>
    path === "/api/v1/skills/"
      ? [SKILLS, 200]
      : [project({ status: "open", roles: [ROLE] }), 200],
  );
  renderEditor(2);
  expect(await screen.findByText("TeamMatch")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Add a role" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Edit role" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Publish project" }),
  ).not.toBeInTheDocument();
});

test("deletes a role after the owner confirms", async () => {
  let roles: unknown[] = [ROLE];
  const calls = mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (method === "DELETE" && path === "/api/v1/roles/3/") {
      roles = [];
      return [null, 204];
    }
    return [project({ roles }), 200];
  });
  renderEditor();
  fireEvent.click(await screen.findByRole("button", { name: "Delete role" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAccessibleName("Delete this role?");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete role" }));

  await vi.waitFor(() =>
    expect(screen.queryByText("Backend dev")).not.toBeInTheDocument(),
  );
  expect(
    calls.some((c) => c.method === "DELETE" && c.path === "/api/v1/roles/3/"),
  ).toBe(true);
});

test("keeping the role sends nothing to the API", async () => {
  const calls = mockApi((method, path) =>
    path === "/api/v1/skills/"
      ? [SKILLS, 200]
      : [project({ roles: [ROLE] }), 200],
  );
  renderEditor();
  fireEvent.click(await screen.findByRole("button", { name: "Delete role" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Keep role",
    }),
  );
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  expect(screen.getByText("Backend dev")).toBeInTheDocument();
});

test("shows the server's reason when a role can't be deleted", async () => {
  mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (method === "DELETE")
      return [
        {
          detail:
            "An open project needs at least one role. Close the project instead.",
        },
        409,
      ];
    return [project({ status: "open", roles: [ROLE] }), 200];
  });
  renderEditor();
  fireEvent.click(await screen.findByRole("button", { name: "Delete role" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete role",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "An open project needs at least one role.",
  );
});
