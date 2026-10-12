import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { NewProjectForm } from "./new-project-form";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewProjectForm />
    </QueryClientProvider>,
  );
}

function mockFetch(body: unknown, status: number) {
  const requests: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request);
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return requests;
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "TeamMatch" } });
  fireEvent.change(screen.getByLabelText("Pitch"), { target: { value: "Find a team" } });
  fireEvent.click(screen.getByRole("button", { name: /create project/i }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "csrftoken=; max-age=0";
});

test("asks for a title and a pitch without calling the API", async () => {
  const requests = mockFetch({}, 201);
  renderForm();
  fireEvent.click(screen.getByRole("button", { name: /create project/i }));
  expect(await screen.findByText("Title is required.")).toBeInTheDocument();
  expect(screen.getByText("Pitch is required.")).toBeInTheDocument();
  expect(requests).toHaveLength(0);
});

test("creates a project and shows the success message", async () => {
  document.cookie = "csrftoken=test-token";
  const requests = mockFetch(
    { id: 1, title: "TeamMatch", pitch: "Find a team", status: "draft", term: 1, owner: 1, created_at: "2026-10-11T00:00:00Z" },
    201,
  );
  renderForm();
  fillAndSubmit();

  expect(await screen.findByText("Project created")).toBeInTheDocument();
  expect(requests).toHaveLength(1);
  expect(requests[0].method).toBe("POST");
  expect(requests[0].url).toContain("/api/v1/projects/");
  expect(requests[0].headers.get("X-CSRFToken")).toBe("test-token");
  expect(await requests[0].json()).toEqual({ title: "TeamMatch", pitch: "Find a team" });
});

test("shows the server's message next to the field", async () => {
  mockFetch({ title: ["Server says no."] }, 400);
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText("Server says no.")).toBeInTheDocument();
});

test("disables creation and explains when there is no active term", async () => {
  mockFetch({ detail: "There is no active term, so projects cannot be created yet." }, 409);
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText(/no active term yet/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /create project/i })).toBeDisabled();
});
