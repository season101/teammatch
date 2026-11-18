import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { AuthForm } from "./auth-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function mockFetch(status: number, body: unknown = {}) {
  // pretend the CSRF cookie is already set so only the form's POST is sent
  document.cookie = "csrftoken=test-token";
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderForm(props: React.ComponentProps<typeof AuthForm> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthForm {...props} />
    </QueryClientProvider>,
  );
}

function continueWithEmail(email: string) {
  fireEvent.change(screen.getByLabelText("School email"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
}

// The last POST the form sent, and what was in it.
function lastPost(fetchMock: ReturnType<typeof mockFetch>) {
  const [url, init] = fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .at(-1)!;
  return { url, body: JSON.parse(init?.body as string) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

test("asks for the school email first, with no password field yet", () => {
  mockFetch(200);
  renderForm();

  expect(
    screen.getByRole("heading", { level: 1, name: "Log in or sign up" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("School email")).toHaveAccessibleDescription(
    "Use your @latech.edu or @email.latech.edu email.",
  );
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});

test("Continue with email carries the email to the password step and signs in", async () => {
  const fetchMock = mockFetch(200, { status: 200, data: { user: { id: 1 } } });
  renderForm({ next: "/projects/12" });
  continueWithEmail("sam@latech.edu");

  expect(screen.getByLabelText("School email")).toHaveValue("sam@latech.edu");
  const password = screen.getByLabelText("Password");
  await waitFor(() => expect(password).toHaveFocus());
  fireEvent.change(password, { target: { value: "a-long-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/12"));
  expect(lastPost(fetchMock)).toEqual({
    url: "/_allauth/browser/v1/auth/login",
    body: { email: "sam@latech.edu", password: "a-long-password" },
  });
});

test("someone new switches to Create account without typing the email again", async () => {
  const fetchMock = mockFetch(401, { status: 401 });
  renderForm();
  continueWithEmail("sam@latech.edu");
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(screen.getByLabelText("School email")).toHaveValue("sam@latech.edu");
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "a-long-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
  expect(lastPost(fetchMock)).toEqual({
    url: "/_allauth/browser/v1/auth/signup",
    body: { email: "sam@latech.edu", password: "a-long-password" },
  });
});

test("/signup opens the password step on Create account, and can switch back", () => {
  mockFetch(200);
  renderForm({ start: "signup" });
  continueWithEmail("sam@latech.edu");

  expect(
    screen.getByRole("button", { name: "Create account" }),
  ).toHaveAttribute("type", "submit");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute(
    "type",
    "submit",
  );
  expect(screen.getByLabelText("School email")).toHaveValue("sam@latech.edu");
});

test("the Google error is gone once the email form is used", () => {
  mockFetch(200);
  renderForm({ googleError: "cancelled" });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Google sign-in was cancelled.",
  );

  continueWithEmail("sam@latech.edu");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
