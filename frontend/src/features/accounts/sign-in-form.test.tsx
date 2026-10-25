import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { getSessionUser } from "./allauth";
import { safeNext, SignInForm } from "./sign-in-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function mockFetch(status: number, body: unknown = {}) {
  // pretend the CSRF cookie is already set so only the sign-in POST is sent
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

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderForm(next?: string, client = newClient()) {
  render(
    <QueryClientProvider client={client}>
      <SignInForm next={next} />
    </QueryClientProvider>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("School email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

test("signs in with the right email and password and goes to the profile", async () => {
  const fetchMock = mockFetch(200, { status: 200, data: { user: { id: 1 } } });
  renderForm();
  fillAndSubmit("sam@latech.edu", "a-long-password");

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/login");
  expect(JSON.parse(init?.body as string)).toEqual({
    email: "sam@latech.edu",
    password: "a-long-password",
  });
});

test("refreshes a cached signed-out session before going back", async () => {
  // A protected page cached "signed out" and sent the user here (bug found in the Sprint 1 demo).
  document.cookie = "csrftoken=test-token";
  let signedIn = false;
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/login")) {
        signedIn = true;
        return reply(200, { status: 200 });
      }
      if (url.endsWith("/auth/session"))
        return signedIn
          ? reply(200, { status: 200, data: { user: { id: 1 } } })
          : reply(401, { status: 401 });
      return reply(404, {});
    }),
  );
  const client = newClient();
  await client.prefetchQuery({
    queryKey: ["session"],
    queryFn: getSessionUser,
  });
  expect(client.getQueryData(["session"])).toBeNull();
  let sessionAtRedirect: unknown;
  replace.mockImplementation(() => {
    sessionAtRedirect = client.getQueryData(["session"]);
  });

  renderForm("/profile", client);
  fillAndSubmit("sam@latech.edu", "a-long-password");

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
  expect(sessionAtRedirect).toEqual({ id: 1 });
});

test("goes back to the page that asked for sign-in", async () => {
  mockFetch(200);
  renderForm("/projects");
  fillAndSubmit("sam@latech.edu", "a-long-password");
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects"));
});

test("shows one generic error for wrong credentials", async () => {
  mockFetch(400, {
    status: 400,
    errors: [
      { message: "The password is wrong.", code: "email_password_mismatch" },
    ],
  });
  renderForm();
  fillAndSubmit("sam@latech.edu", "wrong-password");

  expect(
    await screen.findByText("Email or password is incorrect."),
  ).toBeInTheDocument();
  expect(screen.queryByText("The password is wrong.")).not.toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("tells users from another email domain to use their school email", async () => {
  const message = "Use your @latech.edu or @email.latech.edu email.";
  mockFetch(400, {
    status: 400,
    errors: [{ message, code: "email_domain_not_allowed", param: "email" }],
  });
  renderForm();
  fillAndSubmit("sam@gmail.com", "a-long-password");

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("asks unverified users to check their email", async () => {
  mockFetch(401, {
    status: 401,
    data: { flows: [{ id: "verify_email", is_pending: true }] },
  });
  renderForm();
  fillAndSubmit("sam@latech.edu", "a-long-password");
  expect(
    await screen.findByText(/verify your email first/),
  ).toBeInTheDocument();
});

test("never redirects to another website", () => {
  expect(safeNext("//evil.example")).toBe("/profile");
  expect(safeNext("https://evil.example")).toBe("/profile");
  expect(safeNext(undefined)).toBe("/profile");
  expect(safeNext("/projects")).toBe("/projects");
});
