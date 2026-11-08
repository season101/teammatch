import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ResetPasswordForm } from "./reset-password-form";

type Reply = { status: number; body?: unknown };

// The key check (GET) and the save (POST) can answer differently.
function mockFetch(check: Reply, save: Reply = { status: 401 }) {
  document.cookie = "csrftoken=test-token";
  const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
    const reply = init?.method === "POST" ? save : check;
    return new Response(
      JSON.stringify(reply.body ?? { status: reply.status }),
      {
        status: reply.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const KEY_ERROR = {
  status: 400,
  errors: [
    {
      message: "The password reset token was invalid.",
      code: "invalid_password_reset",
      param: "key",
    },
  ],
};

async function typePassword(value: string) {
  fireEvent.change(await screen.findByLabelText("New password"), {
    target: { value },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
}

test("checks the decoded key, saves the new password and points to sign in", async () => {
  const fetchMock = mockFetch({ status: 200 }, { status: 401 });
  render(<ResetPasswordForm resetKey="1-dhqpq6%3Aabc" />);
  await typePassword("New-pass-456!");

  expect(
    await screen.findByRole("heading", { name: "Your password is set" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );

  const [checkUrl, checkInit] = fetchMock.mock.calls[0];
  expect(checkUrl).toBe("/_allauth/browser/v1/auth/password/reset");
  expect(checkInit?.headers).toMatchObject({
    "X-Password-Reset-Key": "1-dhqpq6:abc",
  });
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
  expect(JSON.parse(post?.[1]?.body as string)).toEqual({
    key: "1-dhqpq6:abc",
    password: "New-pass-456!",
  });
});

test("an expired or used link says so and offers a new one", async () => {
  mockFetch({ status: 400, body: KEY_ERROR });
  render(<ResetPasswordForm resetKey="used-key" />);

  expect(
    await screen.findByRole("heading", { name: "This link has expired" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Send a new link" })).toHaveAttribute(
    "href",
    "/reset-password",
  );
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});

test("a key used up while the page was open also shows the expired state", async () => {
  mockFetch({ status: 200 }, { status: 400, body: KEY_ERROR });
  render(<ResetPasswordForm resetKey="1-abc" />);
  await typePassword("New-pass-456!");

  expect(
    await screen.findByRole("heading", { name: "This link has expired" }),
  ).toBeInTheDocument();
});

test("shows the server's reasons when the password is too weak", async () => {
  mockFetch(
    { status: 200 },
    {
      status: 400,
      body: {
        status: 400,
        errors: [
          {
            message: "This password is too common.",
            code: "password_too_common",
            param: "password",
          },
          {
            message: "This password is entirely numeric.",
            code: "password_entirely_numeric",
            param: "password",
          },
        ],
      },
    },
  );
  render(<ResetPasswordForm resetKey="1-abc" />);
  await typePassword("12345678");

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("This password is too common.");
  expect(alert).toHaveTextContent("This password is entirely numeric.");
  expect(screen.getByLabelText("New password")).toBeInTheDocument();
});
