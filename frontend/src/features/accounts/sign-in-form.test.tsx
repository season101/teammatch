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

test("signs in with the right email and password and goes to Discover", async () => {
  const fetchMock = mockFetch(200, { status: 200, data: { user: { id: 1 } } });
  renderForm();
  fillAndSubmit("sam@latech.edu", "a-long-password");

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/feed"));
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

// Olive left the lab PC signed in. allauth answers 409 to Sam's right password
// and keeps Olive's session (found in the 11-01 bug sweep).
function mockSignedInAsOlive(retryStatus: number) {
  document.cookie = "csrftoken=test-token";
  let user: { id: number; email: string } | null = {
    id: 1,
    email: "olive@latech.edu",
  };
  const reply = (status: number, body: unknown = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/login")) {
      if (user) return reply(409, { status: 409 });
      if (retryStatus !== 200)
        return reply(retryStatus, { status: retryStatus });
      user = { id: 2, email: "sam@latech.edu" };
      return reply(200, { status: 200 });
    }
    if (url.endsWith("/auth/session")) {
      if (init?.method === "DELETE") user = null;
      return user
        ? reply(200, { status: 200, data: { user } })
        : reply(401, { status: 401 });
    }
    return reply(404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("signs the other account out when someone else is still signed in", async () => {
  const fetchMock = mockSignedInAsOlive(200);
  const client = newClient();
  await client.prefetchQuery({
    queryKey: ["session"],
    queryFn: getSessionUser,
  });
  expect(client.getQueryData(["session"])).toEqual({
    id: 1,
    email: "olive@latech.edu",
  });
  fetchMock.mockClear();
  let sessionAtRedirect: unknown;
  replace.mockImplementation(() => {
    sessionAtRedirect = client.getQueryData(["session"]);
  });

  renderForm("/profile", client);
  fillAndSubmit("sam@latech.edu", "a-long-password");

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
  expect(sessionAtRedirect).toEqual({ id: 2, email: "sam@latech.edu" });
  const calls = fetchMock.mock.calls.map(
    ([url, init]) => `${init?.method ?? "GET"} ${url}`,
  );
  expect(calls).toEqual([
    "POST /_allauth/browser/v1/auth/login",
    "DELETE /_allauth/browser/v1/auth/session",
    "POST /_allauth/browser/v1/auth/login",
    "GET /_allauth/browser/v1/auth/session",
  ]);
});

test("drops the other account's cached data before going on", async () => {
  mockSignedInAsOlive(200);
  const client = newClient();
  await client.prefetchQuery({
    queryKey: ["session"],
    queryFn: getSessionUser,
  });
  client.setQueryData(["my-profile"], { id: 1, display_name: "Olive" });
  let cacheAtRedirect: unknown[] = [];
  replace.mockImplementation(() => {
    cacheAtRedirect = [
      client.getQueryData(["session"]),
      client.getQueryData(["my-profile"]),
    ];
  });

  renderForm("/profile", client);
  fillAndSubmit("sam@latech.edu", "a-long-password");

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/profile"));
  expect(cacheAtRedirect).toEqual([
    { id: 2, email: "sam@latech.edu" },
    undefined,
  ]);
});

test("shows the normal error when the retry after signing out fails", async () => {
  const fetchMock = mockSignedInAsOlive(400);
  renderForm();
  fillAndSubmit("sam@latech.edu", "a-long-password");

  expect(
    await screen.findByText("Email or password is incorrect."),
  ).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
  // one retry only
  const logins = fetchMock.mock.calls.filter(([url]) =>
    String(url).endsWith("/auth/login"),
  );
  expect(logins).toHaveLength(2);
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
  // The password field is marked and takes focus, and typing clears the mark.
  const password = screen.getByLabelText("Password");
  expect(password).toHaveFocus();
  expect(password).toBeInvalid();
  fireEvent.change(password, { target: { value: "another-try" } });
  expect(password).toBeValid();
});

test("hides the Google error once the email form is used", async () => {
  mockFetch(400, { status: 400, errors: [] });
  render(
    <QueryClientProvider client={newClient()}>
      <SignInForm googleError="cancelled" />
    </QueryClientProvider>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Google sign-in was cancelled.",
  );

  fillAndSubmit("sam@latech.edu", "wrong-password");

  // findByRole fails if both messages are still showing
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect.",
  );
});

// F1-13, DD-37: a Google-only account gets a prompt instead of the single error.
function mockGoogleOnly(resetStatus = 200) {
  document.cookie = "csrftoken=test-token";
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const fetchMock = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith("/auth/login")
      ? reply(400, {
          status: 400,
          errors: [
            {
              message:
                "This email signs in with Google. Want to set a password too?",
              code: "google_only_account",
            },
          ],
        })
      : reply(resetStatus, { status: resetStatus, errors: [] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("offers a Google-only account a password, and emails the link", async () => {
  const fetchMock = mockGoogleOnly();
  renderForm();
  fillAndSubmit("sam@email.latech.edu", "any-password");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This email signs in with Google. Want to set a password too?",
  );
  expect(
    screen.queryByText("Email or password is incorrect."),
  ).not.toBeInTheDocument();
  // not a wrong password: no red mark on the field
  expect(screen.getByLabelText("Password")).toBeValid();

  fireEvent.click(screen.getByRole("button", { name: "Set a password" }));

  expect(
    await screen.findByRole("heading", { name: "Check your inbox" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "We sent an email to sam@email.latech.edu with the next step.",
  );
  const [url, init] = fetchMock.mock.calls[1];
  expect(url).toBe("/_allauth/browser/v1/auth/password/request");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(init?.body as string)).toEqual({
    email: "sam@email.latech.edu",
  });
  expect(replace).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("hides the Google-only prompt once the email changes", async () => {
  mockGoogleOnly();
  renderForm();
  fillAndSubmit("sam@email.latech.edu", "any-password");
  await screen.findByRole("button", { name: "Set a password" });

  fireEvent.change(screen.getByLabelText("School email"), {
    target: { value: "kim@email.latech.edu" },
  });

  expect(
    screen.queryByRole("button", { name: "Set a password" }),
  ).not.toBeInTheDocument();
});

test("a link request that answers after a newer sign-in doesn't open Check your inbox", async () => {
  const fetchMock = mockGoogleOnly();
  const googleOnlyAnswer = fetchMock.getMockImplementation()!;
  let answerFirstRequest: (response: Response) => void = () => {};
  // The request for sam's link waits until the end; sign-ins answer at once.
  fetchMock.mockImplementation((input, init) =>
    String(input).endsWith("/auth/password/request")
      ? new Promise<Response>((resolve) => (answerFirstRequest = resolve))
      : googleOnlyAnswer(input, init),
  );
  renderForm();
  fillAndSubmit("sam@email.latech.edu", "any-password");
  fireEvent.click(
    await screen.findByRole("button", { name: "Set a password" }),
  );

  // Meanwhile: another Google-only email gets its own prompt.
  fillAndSubmit("kim@email.latech.edu", "any-password");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  answerFirstRequest(
    new Response(JSON.stringify({ status: 200 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Set a password" }),
    ).toBeEnabled(),
  );
  expect(
    screen.queryByRole("heading", { name: "Check your inbox" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "This email signs in with Google.",
  );
});

test("keeps the prompt and says so when the link can't be sent", async () => {
  mockGoogleOnly(429);
  renderForm();
  fillAndSubmit("sam@email.latech.edu", "any-password");
  fireEvent.click(
    await screen.findByRole("button", { name: "Set a password" }),
  );

  expect(
    await screen.findByText("Something went wrong. Try again."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Set a password" }),
  ).toBeInTheDocument();
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

// Each of these would send the browser to another website, or isn't a page at all.
const UNSAFE_NEXT = [
  "//evil.com",
  "/\\evil.com", // browsers read \ as /
  "/\t/evil.com", // browsers drop tabs and newlines
  "/.//evil.com", // tidies up to the path //evil.com
  "/a/..//evil.com",
  "https://evil.com",
  "javascript:alert(1)",
  "",
  undefined,
];

test.each(UNSAFE_NEXT)("never redirects to ?next=%j", (next) => {
  expect(safeNext(next)).toBe("/feed");
});

test.each(["/feed", "/projects", "/projects/3?tab=mine#roles"])(
  "keeps ?next=%j, a page on this site",
  (next) => {
    expect(safeNext(next)).toBe(next);
  },
);

test("a ?next= to another website goes to Discover after sign-in", async () => {
  mockFetch(200);
  renderForm("/\\evil.com");
  fillAndSubmit("sam@latech.edu", "a-long-password");
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/feed"));
});

test("links to the forgot password page (F1-10)", () => {
  renderForm();
  expect(
    screen.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/reset-password");
});
