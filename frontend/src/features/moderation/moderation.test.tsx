import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { Moderation } from "./moderation";

const lee = { id: 7, email: "lee@latech.edu", display_name: "Dr. Lee" };
const kim = { id: 8, email: "kim@latech.edu", display_name: "" };
const lists: Record<string, unknown> = {
  "/api/v1/moderation/terms/": [
    { id: 1, name: "Fall 2026", start_date: "2026-08-24", end_date: "2026-12-12" },
  ],
  "/api/v1/moderation/moderators/": [lee, kim],
  "/api/v1/moderation/projects/": [
    {
      id: 4,
      title: "Bulldog Bites",
      status: "open",
      term: "Fall 2026",
      owner_name: "Marco",
      moderators: [lee],
    },
  ],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// GETs answer with the lists. Writes are recorded and answered by `write`.
let write: () => Response;
const writes: { method: string; path: string; body: unknown }[] = [];
const fetchMock = vi.fn(async (request: Request) => {
  const path = new URL(request.url).pathname;
  if (request.method === "GET") return json(lists[path]);
  const text = await request.text();
  writes.push({ method: request.method, path, body: text ? JSON.parse(text) : null });
  return write();
});

function renderPage(role?: string) {
  write = () => new Response(null, { status: 204 });
  writes.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (role) client.setQueryData(["my-profile"], { role });
  render(
    <QueryClientProvider client={client}>
      <Moderation />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("an admin sees the terms, the moderators and each project's moderators", async () => {
  renderPage("admin");

  expect(await screen.findByRole("list", { name: "Terms" })).toHaveTextContent(
    "Fall 20262026-08-24 to 2026-12-12",
  );
  const moderators = screen.getByRole("list", { name: "Moderators" });
  expect(within(moderators).getByText("Dr. Lee")).toBeInTheDocument();
  // No display name yet: the email stands in.
  expect(within(moderators).getAllByText("kim@latech.edu")).toHaveLength(2);
  expect(screen.getByRole("list", { name: "Moderators on Bulldog Bites" })).toHaveTextContent(
    "Dr. Lee",
  );
  expect(screen.getByText("Fall 2026 · open · by Marco")).toBeInTheDocument();
});

test.each(["student", "moderator"])("a %s is told it's admin only, and nothing loads", (role) => {
  renderPage(role);

  expect(screen.getByRole("alert")).toHaveTextContent("Only an admin can open this page.");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("adding a term sends its name and dates, then reloads the lists", async () => {
  renderPage("admin");
  fireEvent.change(await screen.findByLabelText("Name"), { target: { value: " Spring 2027 " } });
  fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2027-01-11" } });
  fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2027-05-08" } });
  const loads = fetchMock.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Add term" }));

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  expect(writes).toEqual([
    {
      method: "POST",
      path: "/api/v1/moderation/terms/",
      body: { name: "Spring 2027", start_date: "2027-01-11", end_date: "2027-05-08" },
    },
  ]);
  await waitFor(() => expect(fetchMock.mock.calls.length).toBe(loads + 4));
});

test("a term the API refuses shows its reason and keeps what I typed", async () => {
  renderPage("admin");
  fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Clash" } });
  fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-12-01" } });
  fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2027-01-01" } });
  write = () => json({ start_date: ["These dates overlap Fall 2026."] }, 400);
  fireEvent.click(screen.getByRole("button", { name: "Add term" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("These dates overlap Fall 2026.");
  expect(screen.getByLabelText("Name")).toHaveValue("Clash");
});

test("making someone a moderator sends their email", async () => {
  renderPage("admin");
  fireEvent.change(await screen.findByLabelText("Make someone a moderator"), {
    target: { value: "ava@latech.edu" },
  });
  write = () => json({ id: 9, email: "ava@latech.edu", display_name: "Ava" }, 201);
  fireEvent.click(screen.getByRole("button", { name: "Add moderator" }));

  await waitFor(() =>
    expect(writes).toEqual([
      {
        method: "POST",
        path: "/api/v1/moderation/moderators/",
        body: { email: "ava@latech.edu" },
      },
    ]),
  );
});

test("an email with no account shows the API's reason", async () => {
  renderPage("admin");
  fireEvent.change(await screen.findByLabelText("Make someone a moderator"), {
    target: { value: "nobody@latech.edu" },
  });
  write = () => json({ email: ["No account uses that email."] }, 400);
  fireEvent.click(screen.getByRole("button", { name: "Add moderator" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No account uses that email.");
});

test("removing a moderator and taking one off a project call the API", async () => {
  renderPage("admin");
  fireEvent.click(
    await screen.findByRole("button", { name: "Remove kim@latech.edu as a moderator" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  fireEvent.click(screen.getByRole("button", { name: "Take Dr. Lee off Bulldog Bites" }));

  await waitFor(() =>
    expect(writes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      "DELETE /api/v1/moderation/moderators/8/",
      "DELETE /api/v1/moderation/projects/4/moderators/7/",
    ]),
  );
});

test("assigning offers only moderators who aren't on the project yet", async () => {
  renderPage("admin");
  const picker = await screen.findByRole("combobox", { name: "Moderator for Bulldog Bites" });

  expect(within(picker).getAllByRole("option").map((option) => option.textContent)).toEqual([
    "Choose a moderator",
    "kim@latech.edu",
  ]);
  expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();
  fireEvent.change(picker, { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Assign" }));

  await waitFor(() =>
    expect(writes).toEqual([
      { method: "PUT", path: "/api/v1/moderation/projects/4/moderators/8/", body: null },
    ]),
  );
});
