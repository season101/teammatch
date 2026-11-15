import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import NewProjectPage from "@/app/(app)/projects/new/page";
import { NewProjectForm } from "./new-project-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/projects/new",
}));

function renderForm(ui = <NewProjectForm />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
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
  replace.mockClear();
  document.cookie = "csrftoken=; max-age=0";
});

test("the page sends a signed-out visitor to sign in before they fill the form", async () => {
  mockFetch({ status: 401 }, 401);
  renderForm(<NewProjectPage />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Fprojects%2Fnew"));
  expect(screen.queryByLabelText("Title")).toBeNull();
});

test("asks for a title and a pitch without calling the API", async () => {
  const requests = mockFetch({}, 201);
  renderForm();
  fireEvent.click(screen.getByRole("button", { name: /create project/i }));
  expect(await screen.findByText("Title is required.")).toBeInTheDocument();
  expect(screen.getByText("Pitch is required.")).toBeInTheDocument();
  expect(requests).toHaveLength(0);
  expect(screen.getByLabelText("Title")).toHaveFocus();
});

test("a failed submit moves focus to the first invalid field", () => {
  mockFetch({}, 201);
  renderForm();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "TeamMatch" } });
  fireEvent.click(screen.getByRole("button", { name: /create project/i }));
  expect(screen.getByLabelText("Pitch")).toHaveFocus();
});

test("typing in a field with an error doesn't pull focus to another invalid one", () => {
  mockFetch({}, 201);
  renderForm();
  fireEvent.click(screen.getByRole("button", { name: /create project/i }));
  const pitch = screen.getByLabelText("Pitch");
  pitch.focus();
  fireEvent.change(pitch, { target: { value: "Find a team" } });
  expect(pitch).toHaveFocus();
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
  // Both optional fields left empty: the project saves as before (F2-12).
  expect(await requests[0].json()).toEqual({
    title: "TeamMatch",
    pitch: "Find a team",
    repo_url: "",
    details: "",
  });
});

test("sends the repository and more details when filled in", async () => {
  const requests = mockFetch({ id: 1, title: "TeamMatch" }, 201);
  renderForm();
  fireEvent.change(screen.getByLabelText("GitHub repository (optional)"), {
    target: { value: " https://github.com/olive/campus-eats " },
  });
  fireEvent.change(screen.getByLabelText("More details (optional)"), {
    target: { value: "We meet Tuesdays" },
  });
  expect(screen.getByText("16/2000 characters")).toBeInTheDocument();
  fillAndSubmit();

  expect(await screen.findByText("Project created")).toBeInTheDocument();
  expect(await requests[0].json()).toMatchObject({
    repo_url: "https://github.com/olive/campus-eats",
    details: "We meet Tuesdays",
  });
});

test("a link that isn't to GitHub shows the server's error on the field and keeps the form", async () => {
  const message = "Enter a link that starts with https://github.com/";
  mockFetch({ repo_url: [message] }, 400);
  renderForm();
  const repo = screen.getByLabelText("GitHub repository (optional)");
  fireEvent.change(repo, { target: { value: "campus-eats.com" } });
  fireEvent.change(screen.getByLabelText("More details (optional)"), {
    target: { value: "We meet Tuesdays" },
  });
  fillAndSubmit();

  expect(await screen.findByText(message)).toHaveAttribute("id", "project-repo-error");
  expect(repo).toHaveAttribute("aria-invalid", "true");
  expect(repo).toHaveFocus();
  expect(repo).toHaveAccessibleDescription(
    `For software projects. Must be a github.com link. ${message}`,
  );
  // Nothing typed is lost, and no generic error shows.
  expect(repo).toHaveValue("campus-eats.com");
  expect(screen.getByLabelText("Title")).toHaveValue("TeamMatch");
  expect(screen.getByLabelText("Pitch")).toHaveValue("Find a team");
  expect(screen.getByLabelText("More details (optional)")).toHaveValue("We meet Tuesdays");
  expect(screen.queryByText("Something went wrong. Please try again.")).not.toBeInTheDocument();

  // Fixing the link clears the error before the next save.
  fireEvent.change(repo, { target: { value: "https://github.com/olive/campus-eats" } });
  expect(screen.queryByText(message)).not.toBeInTheDocument();
  expect(repo).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByLabelText("More details (optional)")).toHaveValue("We meet Tuesdays");
});

test("shows the server's message next to the field", async () => {
  mockFetch({ title: ["Server says no."] }, 400);
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText("Server says no.")).toBeInTheDocument();
});

test("a 401 says to sign in", async () => {
  mockFetch({ detail: "Authentication credentials were not provided.", code: "not_authenticated" }, 401);
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText("Sign in to create a project.")).toBeInTheDocument();
});

test("a 403 is not signed out: it shows the server's reason", async () => {
  mockFetch(
    { detail: "Agree to the Team rules before you do that.", code: "rules_not_accepted" },
    403,
  );
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText("Agree to the Team rules before you do that.")).toBeInTheDocument();
  expect(screen.queryByText("Sign in to create a project.")).not.toBeInTheDocument();
  expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
});

test("disables creation and explains when there is no active term", async () => {
  mockFetch({ detail: "There is no active term, so projects cannot be created yet." }, 409);
  renderForm();
  fillAndSubmit();
  expect(await screen.findByText(/no active term yet/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /create project/i })).toBeDisabled();
});
