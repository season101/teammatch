import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { ForgotPasswordForm } from "./forgot-password-form";

function mockFetch(status: number, body: unknown = { status }) {
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

afterEach(() => vi.unstubAllGlobals());

function submit(email: string) {
  render(<ForgotPasswordForm />);
  fireEvent.change(screen.getByLabelText("School email"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

test("asks allauth for a reset link and says to check the inbox", async () => {
  const fetchMock = mockFetch(200);
  submit("weibo@latech.edu");

  expect(
    await screen.findByRole("heading", { name: "Check your inbox" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "If weibo@latech.edu has a TeamMatch account",
  );
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/password/request");
  expect(init?.method).toBe("POST");
  expect(init?.headers).toMatchObject({ "X-CSRFToken": "test-token" });
  expect(JSON.parse(init?.body as string)).toEqual({
    email: "weibo@latech.edu",
  });
});

test("shows the server's message for an email outside the school domains", async () => {
  mockFetch(400, {
    status: 400,
    errors: [
      {
        message: "Use your @latech.edu or @email.latech.edu email.",
        code: "email_domain_not_allowed",
        param: "email",
      },
    ],
  });
  submit("someone@gmail.com");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Use your @latech.edu or @email.latech.edu email.",
  );
  expect(
    screen.queryByRole("heading", { name: "Check your inbox" }),
  ).not.toBeInTheDocument();
});

test("Use a different email goes back to the form", async () => {
  mockFetch(200);
  submit("weibo@latech.edu");

  fireEvent.click(
    await screen.findByRole("button", { name: "Use a different email" }),
  );
  expect(screen.getByLabelText("School email")).toHaveValue("weibo@latech.edu");
});
