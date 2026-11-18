import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { deckHandoff } from "@/features/feed/role-card";
import { RoleDetails } from "./role-details";

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

type Reply = [unknown, number];
type Call = { method: string; path: string; body: unknown };

function mockApi(
  handler: (method: string, path: string) => Reply | Promise<Reply> | undefined,
) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const body =
        request.method === "GET" ? undefined : await request.json().catch(() => undefined);
      calls.push({ method: request.method, path, body });
      const [payload, status] = (await handler(request.method, path)) ?? [{}, 200];
      return new Response(status === 204 ? null : JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

const SKILLS = [
  { id: 1, name: "Figma", slug: "figma" },
  { id: 2, name: "Prototyping", slug: "prototyping" },
];

const ROLE = {
  id: 3,
  project: 7,
  title: "UI designer",
  description: "Design the ordering screens",
  status: "open",
  required_skills: [1, 2],
  filled_by_name: "",
  created_at: "2026-11-01T00:00:00Z",
};

const project = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  title: "Campus Eats",
  pitch: "Order ahead from campus food trucks",
  repo_url: "https://github.com/olive/campus-eats",
  details: "We meet Tuesdays",
  status: "open",
  owner: 2,
  owner_name: "Olive Nguyen",
  moderators: [] as string[],
  roles: [
    ROLE,
    { ...ROLE, id: 4, title: "Backend developer", status: "filled", filled_by_name: "Sam Lee" },
    { ...ROLE, id: 5, title: "Tester", required_skills: [] },
  ],
  created_at: "2026-11-01T00:00:00Z",
  ...overrides,
});

// Someone else's open project; `mine` is what GET my applications returns.
function api({
  details = project(),
  mine = [] as unknown[],
  apply = [{ id: 20, role: 3, note: "", status: "pending" }, 201] as Reply,
  dismiss = [null, 204] as Reply,
  // Apply answers once this settles.
  wait = Promise.resolve(),
} = {}) {
  return mockApi((method, path) => {
    if (path === "/api/v1/skills/") return [SKILLS, 200];
    if (path === "/api/v1/me/profile/") return [{ skills: [SKILLS[0]] }, 200];
    if (path === "/api/v1/applications/mine/") return [{ results: mine }, 200];
    if (path === "/api/v1/projects/7/") return [details, 200];
    if (method === "POST" && path === "/api/v1/applications/") return wait.then(() => apply);
    if (method === "POST" && path === "/api/v1/roles/3/dismiss/") return dismiss;
  });
}

const FEED_ROLE = { id: 3, title: "UI designer" };
const NEXT_ROLE = { id: 9, title: "Next card" };

function renderDetails({ userId = 1, roleId = 3 } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The deck's cached feed, with this role on top.
  client.setQueryData(["feed"], [FEED_ROLE, NEXT_ROLE]);
  render(
    <QueryClientProvider client={client}>
      <RoleDetails projectId={7} roleId={roleId} userId={userId} />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  router.push.mockReset();
  router.back.mockReset();
  deckHandoff.opened = null;
  deckHandoff.returning = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows the role, the project, its code, more from the owner and the team so far", async () => {
  api();
  renderDetails();
  const heading = await screen.findByRole("heading", { level: 1, name: "UI designer" });
  // Focused on the role.
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText("Campus Eats · by Olive Nguyen")).toBeInTheDocument();
  const skills = screen.getByRole("list", { name: "Skills for UI designer" });
  expect(within(skills).getByText("(matched)")).toBeInTheDocument();
  expect(within(skills).getByText("Prototyping")).toBeInTheDocument();
  expect(screen.getByText("Design the ordering screens")).toBeInTheDocument();
  expect(screen.getByText("Order ahead from campus food trucks")).toBeInTheDocument();
  const code = screen.getByRole("link", { name: /View the code/ });
  expect(code).toHaveAttribute("href", "https://github.com/olive/campus-eats");
  expect(code).toHaveAttribute("target", "_blank");
  expect(screen.getByText("We meet Tuesdays")).toBeInTheDocument();
  expect(screen.getByText("Olive Nguyen, owner")).toBeInTheDocument();
  expect(screen.getByText("Sam Lee, Backend developer")).toBeInTheDocument();
  expect(screen.getByText("Tester, open")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Apply to UI designer on Campus Eats" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pass on UI designer" })).toBeInTheDocument();
});

test("my own project offers no Apply or Pass", async () => {
  const calls = api();
  renderDetails({ userId: 2 });
  expect(await screen.findByRole("heading", { name: "UI designer" })).toBeInTheDocument();
  await waitFor(() =>
    expect(calls.some((call) => call.path === "/api/v1/applications/mine/")).toBe(true),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByRole("button", { name: /Apply to/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Pass on/ })).not.toBeInTheDocument();
});

test("a role I already applied to shows its status instead of Apply and Pass", async () => {
  api({ mine: [{ id: 20, status: "pending", role: { id: 3, title: "UI designer" } }] });
  renderDetails();
  expect(await screen.findByText("Applied")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Apply to/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Pass on/ })).not.toBeInTheDocument();
});

test("a filled role offers no Apply or Pass, and its member is in the team", async () => {
  api({ details: project({ roles: [{ ...ROLE, status: "filled", filled_by_name: "Kim" }] }) });
  renderDetails();
  expect(await screen.findByText("This role is filled.")).toBeInTheDocument();
  expect(screen.getByText("Kim, UI designer")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Apply to/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Pass on/ })).not.toBeInTheDocument();
});

test("empty repository and more details show nothing extra", async () => {
  api({ details: project({ repo_url: "", details: "" }) });
  renderDetails();
  expect(await screen.findByRole("heading", { name: "UI designer" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /View the code/ })).not.toBeInTheDocument();
  expect(screen.queryByText("More from the owner")).not.toBeInTheDocument();
});

test("a role that isn't on the project shows the whole project page", async () => {
  api();
  renderDetails({ roleId: 99 });
  expect(await screen.findByRole("heading", { name: "Campus Eats" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Roles" })).toBeInTheDocument();
});

test("opened from the deck, Esc or Back steps back to it, once", async () => {
  deckHandoff.opened = 3;
  api();
  renderDetails();
  // The page took the hand-off on opening, so a later visit from a link can't reuse it.
  expect(deckHandoff.opened).toBeNull();
  const backLink = await screen.findByRole("link", { name: "Back to the deck" });
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(deckHandoff.returning).toBe(true);
  // Already on the way back: a second press doesn't step back past the deck.
  fireEvent.click(backLink);
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
});

test("opened from a link, Back goes to Discover", async () => {
  api();
  renderDetails();
  const backLink = await screen.findByRole("link", { name: "Back to the deck" });
  expect(backLink).toHaveAttribute("href", "/feed");
  fireEvent.click(backLink);
  expect(router.push).toHaveBeenCalledWith("/feed");
  expect(router.back).not.toHaveBeenCalled();
});

test("applies with a note up to 300 characters, then goes back to the deck on the next card", async () => {
  deckHandoff.opened = 3;
  const calls = api();
  const client = renderDetails();
  fireEvent.click(await screen.findByRole("button", { name: "Add a note" }));
  const note = screen.getByLabelText("Note to the owner (optional)");
  await waitFor(() => expect(note).toHaveFocus());
  expect(note).toHaveAttribute("maxLength", "300");
  fireEvent.change(note, { target: { value: " I love Figma " } });
  expect(screen.getByText("14/300 characters")).toBeInTheDocument();
  // Esc in the note doesn't leave the page.
  fireEvent.keyDown(note, { key: "Escape" });
  expect(router.back).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Apply to UI designer on Campus Eats" }));

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(calls.find((call) => call.path === "/api/v1/applications/")?.body).toEqual({
    role: 3,
    note: "I love Figma",
  });
  // The deck shows the next card.
  expect(client.getQueryData(["feed"])).toEqual([NEXT_ROLE]);
});

test("an Apply that lands after I pressed Back doesn't step back again", async () => {
  deckHandoff.opened = 3;
  let answer = () => {};
  const calls = api({ wait: new Promise<void>((resolve) => (answer = resolve)) });
  const client = renderDetails();
  fireEvent.click(
    await screen.findByRole("button", { name: "Apply to UI designer on Campus Eats" }),
  );
  await waitFor(() =>
    expect(calls.some((call) => call.path === "/api/v1/applications/")).toBe(true),
  );
  fireEvent.click(screen.getByRole("link", { name: "Back to the deck" }));
  expect(router.back).toHaveBeenCalledTimes(1);

  answer();
  // Saved all the same, and the deck drops the role.
  await waitFor(() => expect(client.getQueryData(["feed"])).toEqual([NEXT_ROLE]));
  expect(router.back).toHaveBeenCalledTimes(1);
});

test("passes, then goes to Discover when opened from a link", async () => {
  const calls = api();
  const client = renderDetails();
  fireEvent.click(await screen.findByRole("button", { name: "Pass on UI designer" }));

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/feed"));
  expect(calls.some((call) => call.path === "/api/v1/roles/3/dismiss/")).toBe(true);
  expect(client.getQueryData(["feed"])).toEqual([NEXT_ROLE]);
});

test("a role that filled meanwhile shows the server's message and leaves the deck", async () => {
  api({ apply: [{ detail: "This role was just filled.", code: "role_not_open" }, 409] });
  const client = renderDetails();
  fireEvent.click(
    await screen.findByRole("button", { name: "Apply to UI designer on Campus Eats" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("This role was just filled.");
  expect(router.back).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(client.getQueryData(["feed"])).toEqual([NEXT_ROLE]);
});

test("a failed pass keeps the page and says why", async () => {
  api({ dismiss: [{ detail: "Couldn't pass. Please try again." }, 500] });
  const client = renderDetails();
  fireEvent.click(await screen.findByRole("button", { name: "Pass on UI designer" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pass.");
  expect(router.push).not.toHaveBeenCalled();
  expect(client.getQueryData(["feed"])).toEqual([FEED_ROLE, NEXT_ROLE]);
});
