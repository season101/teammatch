import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

function mockFetch(body: unknown, status: number) {
  // pretend the CSRF cookie is already set so only the sign-up POST is sent
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

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("School email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

afterEach(() => vi.unstubAllGlobals());

test("sends email and password to allauth and asks the user to check their email", async () => {
  const fetchMock = mockFetch(
    { status: 401, flows: [{ id: "verify_email", is_pending: true }] },
    401,
  );
  render(<SignUpForm />);
  fillAndSubmit("sam@latech.edu", "a-long-password");

  expect(await screen.findByText("Check your email")).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/signup");
  expect(JSON.parse(init?.body as string)).toEqual({
    email: "sam@latech.edu",
    password: "a-long-password",
  });
});

test("tells the user to sign in when the email is already registered", async () => {
  mockFetch(
    {
      status: 400,
      errors: [{ message: "taken", code: "email_taken", param: "email" }],
    },
    400,
  );
  render(<SignUpForm />);
  fillAndSubmit("sam@latech.edu", "a-long-password");

  expect(
    await screen.findByText(
      "An account with this email exists. Sign in instead.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("shows allauth's message for other errors, like a weak password", async () => {
  mockFetch(
    {
      status: 400,
      errors: [
        {
          message: "This password is too common.",
          code: "password_too_common",
        },
      ],
    },
    400,
  );
  render(<SignUpForm />);
  fillAndSubmit("sam@latech.edu", "password");

  expect(
    await screen.findByText("This password is too common."),
  ).toBeInTheDocument();
});
