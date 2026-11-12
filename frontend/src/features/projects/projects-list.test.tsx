import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ProjectsList } from "./projects-list";

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectsList />
    </QueryClientProvider>,
  );
}

// Each call to fetch gets the next [body, status] pair.
function mockFetch(...responses: Array<[unknown, number]>) {
  const requests: Request[] = [];
  const queue = [...responses];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request);
      const [body, status] = queue.shift() ?? [{}, 500];
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return requests;
}

const project = (id: number, title: string) => ({
  id,
  title,
  pitch_preview: `Pitch for ${title}`,
  owner: 1,
  owner_name: "Owner Name",
  open_role_count: 2,
  created_at: "2026-10-16T00:00:00Z",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows each project with its owner, role count and pitch preview", async () => {
  mockFetch([
    { next: null, previous: null, results: [project(1, "TeamMatch")] },
    200,
  ]);
  renderList();
  expect(await screen.findByText("TeamMatch")).toBeInTheDocument();
  expect(screen.getByText(/Owner Name/)).toBeInTheDocument();
  expect(screen.getByText(/2 open roles/)).toBeInTheDocument();
  expect(screen.getByText("Pitch for TeamMatch")).toBeInTheDocument();
});

test("shows skeleton rows while the projects load", () => {
  mockFetch([{ next: null, previous: null, results: [] }, 200]);
  renderList();
  expect(
    screen.getByRole("status", { name: "Loading projects" }),
  ).toBeInTheDocument();
});

test("says so when there are no open projects and links to post one", async () => {
  mockFetch([{ next: null, previous: null, results: [] }, 200]);
  renderList();
  expect(
    await screen.findByRole("heading", { name: "No open projects yet" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Be the first to post one this term."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Post a project" })).toHaveAttribute(
    "href",
    "/projects/new",
  );
});

test("loads the next page with the cursor", async () => {
  const requests = mockFetch(
    [
      {
        next: "http://localhost/api/v1/projects/?cursor=abc",
        previous: null,
        results: [project(1, "First")],
      },
      200,
    ],
    [{ next: null, previous: null, results: [project(2, "Second")] }, 200],
  );
  renderList();
  fireEvent.click(await screen.findByRole("button", { name: /load more/i }));
  expect(await screen.findByText("Second")).toBeInTheDocument();
  expect(screen.getByText("First")).toBeInTheDocument();
  expect(requests[1].url).toContain("cursor=abc");
  expect(
    screen.queryByRole("button", { name: /load more/i }),
  ).not.toBeInTheDocument();
});

test("offers to try again when the list can't be loaded", async () => {
  mockFetch(
    [{}, 500],
    [{ next: null, previous: null, results: [project(1, "TeamMatch")] }, 200],
  );
  renderList();
  expect(
    await screen.findByRole("heading", { name: "Couldn't load projects" }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("TeamMatch")).toBeInTheDocument();
});

const search = (value: string) =>
  fireEvent.change(
    screen.getByRole("searchbox", { name: /search projects/i }),
    { target: { value } },
  );

test("sends the trimmed search to the API and keeps the old results meanwhile", async () => {
  const requests = mockFetch(
    [
      {
        next: null,
        previous: null,
        results: [project(1, "Bulldog Bites"), project(2, "Thesis Tracker")],
      },
      200,
    ],
    [{ next: null, previous: null, results: [project(2, "Thesis Tracker")] }, 200],
  );
  renderList();
  expect(await screen.findByText("Bulldog Bites")).toBeInTheDocument();
  expect(new URL(requests[0].url).searchParams.has("q")).toBe(false);

  search("  thesis ");
  // Not sent yet (debounced), and nothing on screen changes while it loads.
  expect(requests).toHaveLength(1);
  expect(screen.getByText("Bulldog Bites")).toBeInTheDocument();

  await waitFor(() =>
    expect(screen.queryByText("Bulldog Bites")).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Thesis Tracker")).toBeInTheDocument();
  expect(requests).toHaveLength(2);
  expect(new URL(requests[1].url).searchParams.get("q")).toBe("thesis");
  expect(screen.queryByText(/loaded so far/i)).not.toBeInTheDocument();
});

test("says nothing matches and clears the search", async () => {
  mockFetch(
    [{ next: null, previous: null, results: [project(1, "Bulldog Bites")] }, 200],
    [{ next: null, previous: null, results: [] }, 200],
    [{ next: null, previous: null, results: [project(1, "Bulldog Bites")] }, 200],
  );
  renderList();
  await screen.findByText("Bulldog Bites");

  search("rust");
  expect(
    await screen.findByRole("heading", { name: "Nothing matches \u201crust\u201d" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Try a skill or a project name.")).toBeInTheDocument();
  expect(screen.queryByText("Bulldog Bites")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(await screen.findByText("Bulldog Bites")).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: /search projects/i })).toHaveValue("");
});
