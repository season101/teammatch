import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { VerifyEmail } from "./verify-email";

function mockFetch(status: number) {
  document.cookie = "csrftoken=test-token";
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ status }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

test("signed in by the link: Continue goes on to setup", async () => {
  const fetchMock = mockFetch(200);
  render(<VerifyEmail verificationKey="Mw%3A1xH8V1%3Aabc-_123" />);
  fireEvent.click(screen.getByRole("button", { name: "Verify my email" }));

  expect(await screen.findByText("You're verified")).toBeInTheDocument();
  // The deck's gate sends a new account on to Team rules.
  expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
    "href",
    "/feed",
  );
  // The key is decoded from the link before it goes to allauth.
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/email/verify");
  expect(JSON.parse(init?.body as string)).toEqual({
    key: "Mw:1xH8V1:abc-_123",
  });
});

test("verified in another browser: offers Sign in, not Continue", async () => {
  mockFetch(401);
  render(<VerifyEmail verificationKey="key" />);
  fireEvent.click(screen.getByRole("button", { name: "Verify my email" }));

  expect(await screen.findByText("You're verified")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Sign in with your school email and password",
  );
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(
    screen.queryByRole("link", { name: "Continue" }),
  ).not.toBeInTheDocument();
});

test("shows an error for an invalid or expired key", async () => {
  mockFetch(400);
  render(<VerifyEmail verificationKey="bad" />);
  fireEvent.click(screen.getByRole("button", { name: "Verify my email" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Verification links last 3 days",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Sign in to get a new one.",
  );
  // Signing in sends a new link; signing up again doesn't (F1-14).
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(
    screen.queryByRole("link", { name: "Sign up again" }),
  ).not.toBeInTheDocument();
});
