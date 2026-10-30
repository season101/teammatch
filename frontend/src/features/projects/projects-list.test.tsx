import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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

test("says so when there are no open projects", async () => {
  mockFetch([{ next: null, previous: null, results: [] }, 200]);
  renderList();
  expect(await screen.findByText(/no open projects yet/i)).toBeInTheDocument();
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

test("shows a message when the list can't be loaded", async () => {
  mockFetch([{}, 500]);
  renderList();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /could not load projects/i,
  );
});

test("search narrows the list by title, owner or pitch", async () => {
  mockFetch([
    {
      next: null,
      previous: null,
      results: [project(1, "Bulldog Bites"), project(2, "Thesis Tracker")],
    },
    200,
  ]);
  renderList();
  expect(await screen.findByText("Bulldog Bites")).toBeInTheDocument();

  fireEvent.change(
    screen.getByRole("searchbox", { name: /search projects/i }),
    {
      target: { value: "thesis" },
    },
  );
  expect(screen.getByText("Thesis Tracker")).toBeInTheDocument();
  expect(screen.queryByText("Bulldog Bites")).not.toBeInTheDocument();
});

test("says nothing matches and clears the search", async () => {
  mockFetch([
    { next: null, previous: null, results: [project(1, "Bulldog Bites")] },
    200,
  ]);
  renderList();
  await screen.findByText("Bulldog Bites");

  fireEvent.change(
    screen.getByRole("searchbox", { name: /search projects/i }),
    {
      target: { value: "Unity" },
    },
  );
  expect(screen.getByText(/No projects match/)).toBeInTheDocument();
  expect(screen.queryByText("Bulldog Bites")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
  expect(screen.getByText("Bulldog Bites")).toBeInTheDocument();
});

test("warns that search only covers the loaded projects while more pages exist", async () => {
  mockFetch([
    {
      next: "http://localhost/api/v1/projects/?cursor=abc",
      previous: null,
      results: [project(1, "First")],
    },
    200,
  ]);
  renderList();
  await screen.findByText("First");

  fireEvent.change(
    screen.getByRole("searchbox", { name: /search projects/i }),
    {
      target: { value: "first" },
    },
  );
  expect(screen.getByText(/loaded so far/i)).toBeInTheDocument();
});
