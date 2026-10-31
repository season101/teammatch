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

test("decodes the key from the link before sending it to allauth", async () => {
  const fetchMock = mockFetch(401);
  render(<VerifyEmail verificationKey="Mw%3A1xH8V1%3Aabc-_123" />);
  fireEvent.click(screen.getByRole("button", { name: "Verify my email" }));

  expect(await screen.findByText("You're verified")).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/email/verify");
  expect(JSON.parse(init?.body as string)).toEqual({
    key: "Mw:1xH8V1:abc-_123",
  });
});

test("shows an error for an invalid or expired key", async () => {
  mockFetch(400);
  render(<VerifyEmail verificationKey="bad" />);
  fireEvent.click(screen.getByRole("button", { name: "Verify my email" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Verification links last 3 days",
  );
  expect(screen.getByRole("link", { name: "Sign up again" })).toHaveAttribute(
    "href",
    "/signup",
  );
});
