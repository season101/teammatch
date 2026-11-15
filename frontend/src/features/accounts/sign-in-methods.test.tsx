import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { SignInMethods } from "./sign-in-methods";

type Account = { email: string; password: boolean; google: boolean };

// A tiny fake allauth: the session, linked providers, and the password change.
function mockAllauth(
  account: Account,
  change = { status: 200, body: {} as unknown },
  googleKeys = true,
) {
  document.cookie = "csrftoken=test-token";
  let current = { ...account };
  const posts: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const reply = (status: number, body: unknown) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (init?.method === "POST") {
        posts.push({ url, body: JSON.parse(String(init.body)) });
        if (change.status === 200) current = { ...current, password: true };
        return reply(change.status, change.body);
      }
      if (url.endsWith("/auth/session"))
        return reply(200, {
          data: {
            user: {
              id: 1,
              email: current.email,
              has_usable_password: current.password,
            },
          },
        });
      if (url.endsWith("/account/providers"))
        return reply(200, {
          data: current.google ? [{ provider: { id: "google" } }] : [],
        });
      if (url.endsWith("/config"))
        return reply(200, {
          data: {
            socialaccount: {
              providers: googleKeys ? [{ id: "google" }] : [],
            },
          },
        });
      return reply(404, {});
    }),
  );
  return posts;
}

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SignInMethods />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

test("an email account shows its password and offers to connect Google (screen 42)", async () => {
  mockAllauth({ email: "sam@email.latech.edu", password: true, google: false });
  renderSection();

  const section = await screen.findByRole("region", {
    name: "Ways to sign in",
  });
  expect(
    await within(section).findByText("Email and password"),
  ).toBeInTheDocument();
  expect(section).toHaveTextContent("sam@email.latech.edu");
  expect(section).toHaveTextContent("On");
  expect(section).toHaveTextContent("Not connected");
  expect(
    within(section).getByRole("button", { name: "Connect" }),
  ).toBeInTheDocument();
});

test("Connect starts the Google redirect as a connect, coming back to Settings", async () => {
  mockAllauth({ email: "sam@email.latech.edu", password: true, google: false });
  const submit = vi
    .spyOn(HTMLFormElement.prototype, "submit")
    .mockImplementation(() => {});
  renderSection();

  fireEvent.click(await screen.findByRole("button", { name: "Connect" }));

  await waitFor(() => expect(submit).toHaveBeenCalled());
  const form = submit.mock.contexts[0] as HTMLFormElement;
  const fields = Object.fromEntries(new FormData(form));
  expect(form.action).toContain("/_allauth/browser/v1/auth/provider/redirect");
  expect(fields).toMatchObject({
    provider: "google",
    process: "connect",
    callback_url: "/settings",
  });
});

test("staff on @latech.edu aren't offered Google", async () => {
  mockAllauth({ email: "prof@latech.edu", password: true, google: false });
  renderSection();

  expect(await screen.findByText("Email and password")).toBeInTheDocument();
  expect(screen.queryByText("Google")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Connect" }),
  ).not.toBeInTheDocument();
});

test("a Google account sets a password without a current one, then both show on (screens 43 to 45)", async () => {
  const posts = mockAllauth({
    email: "sam@email.latech.edu",
    password: false,
    google: true,
  });
  renderSection();

  const section = await screen.findByRole("region", {
    name: "Ways to sign in",
  });
  expect(await within(section).findByText("Connected")).toBeInTheDocument();
  expect(section).toHaveTextContent("Not set up");

  fireEvent.click(
    within(section).getByRole("button", { name: "Set a password" }),
  );
  expect(section).toHaveTextContent(
    "Sign in with sam@email.latech.edu and this password. Google keeps working.",
  );
  fireEvent.change(within(section).getByLabelText("New password"), {
    target: { value: "a-new-long-password-7" },
  });
  fireEvent.click(
    within(section).getByRole("button", { name: "Save password" }),
  );

  expect(await within(section).findByRole("status")).toHaveTextContent(
    "Password saved.",
  );
  expect(await within(section).findByText("On")).toBeInTheDocument();
  expect(section).toHaveTextContent("Connected");
  expect(posts).toEqual([
    {
      url: "/_allauth/browser/v1/account/password/change",
      body: { new_password: "a-new-long-password-7" },
    },
  ]);
});

test("a weak password shows the server's reasons and keeps the form", async () => {
  mockAllauth(
    { email: "sam@email.latech.edu", password: false, google: true },
    {
      status: 400,
      body: {
        errors: [
          {
            message: "This password is too common.",
            code: "password_too_common",
            param: "new_password",
          },
        ],
      },
    },
  );
  renderSection();

  fireEvent.click(
    await screen.findByRole("button", { name: "Set a password" }),
  );
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This password is too common.",
  );
  expect(screen.getByLabelText("New password")).toBeInTheDocument();
});

test("a refused Connect says why, and the error leaves the address (screen 46)", async () => {
  window.history.replaceState(
    null,
    "",
    "/settings?error=google_email_mismatch&error_process=connect",
  );
  mockAllauth({ email: "sam@email.latech.edu", password: true, google: false });
  renderSection();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "That Google account uses a different email. Use the one for sam@email.latech.edu.",
  );
  expect(window.location.search).toBe("");
});

test("with no Google keys on the server, there's no Google row to connect", async () => {
  mockAllauth(
    { email: "sam@email.latech.edu", password: true, google: false },
    undefined,
    false,
  );
  renderSection();

  expect(await screen.findByText("Email and password")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Connect" }),
  ).not.toBeInTheDocument();
});
