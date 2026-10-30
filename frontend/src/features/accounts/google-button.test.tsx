import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { GoogleButton } from "./google-button";
import { SignInForm } from "./sign-in-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

// /config lists the providers the server has keys for.
function mockConfig(providers: { id: string }[]) {
  document.cookie = "csrftoken=test-token";
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            status: 200,
            data: { socialaccount: { providers } },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
}

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // the hidden form continueWith() adds to the page
  document
    .querySelectorAll('form[action*="provider/redirect"]')
    .forEach((form) => form.remove());
});

test("shows Continue with Google when the server has Google keys", async () => {
  mockConfig([{ id: "google" }]);
  renderWithClient(<GoogleButton />);
  expect(
    await screen.findByRole("button", { name: "Continue with Google" }),
  ).toBeInTheDocument();
});

test("shows nothing when the server has no Google keys", async () => {
  mockConfig([]);
  renderWithClient(<GoogleButton />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(
    screen.queryByRole("button", { name: "Continue with Google" }),
  ).not.toBeInTheDocument();
});

test("clicking it posts a real form to allauth, which redirects to Google", async () => {
  mockConfig([{ id: "google" }]);
  const submit = vi
    .spyOn(HTMLFormElement.prototype, "submit")
    .mockImplementation(() => {});
  renderWithClient(<GoogleButton />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Continue with Google" }),
  );

  await waitFor(() => expect(submit).toHaveBeenCalled());
  const form = submit.mock.contexts[0] as HTMLFormElement;
  expect(form.method).toBe("post");
  expect(form.action).toContain("/_allauth/browser/v1/auth/provider/redirect");
  expect(Object.fromEntries(new FormData(form))).toEqual({
    provider: "google",
    callback_url: "/auth/callback",
    process: "login",
    csrfmiddlewaretoken: "test-token",
  });
  expect(
    screen.getByRole("button", { name: "Opening Google…" }),
  ).toBeDisabled();
});

test("can be clicked again when the server can't be reached", async () => {
  mockConfig([{ id: "google" }]);
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const config = vi.mocked(fetch).getMockImplementation()!;
  // /config answers, then the csrf GET before the form POST fails
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    if (String(url).endsWith("/config")) return config(url, init);
    throw new TypeError("Failed to fetch");
  });
  renderWithClient(<GoogleButton />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Continue with Google" }),
  );

  expect(
    await screen.findByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("Back from Google re-enables the button", async () => {
  mockConfig([{ id: "google" }]);
  vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
  renderWithClient(<GoogleButton />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Continue with Google" }),
  );
  await screen.findByRole("button", { name: "Opening Google…" });

  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));

  expect(
    await screen.findByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("passes ?next= through Google so the student lands where they were going", async () => {
  mockConfig([{ id: "google" }]);
  const submit = vi
    .spyOn(HTMLFormElement.prototype, "submit")
    .mockImplementation(() => {});
  renderWithClient(<GoogleButton next="/projects/12" />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Continue with Google" }),
  );

  await waitFor(() => expect(submit).toHaveBeenCalled());
  const form = submit.mock.contexts[0] as HTMLFormElement;
  expect(new FormData(form).get("callback_url")).toBe(
    "/auth/callback?next=%2Fprojects%2F12",
  );
});

test.each([
  ["cancelled", "Google sign-in was cancelled."],
  [
    "google_account_not_allowed",
    "Use your @email.latech.edu Google account, or sign in with email and password.",
  ],
  [
    "email_domain_not_allowed",
    "Use your @latech.edu or @email.latech.edu email.",
  ],
  ["something_new", "Couldn't sign in with Google. Try again."],
])("the sign-in page explains ?error=%s", (code, message) => {
  mockConfig([]);
  renderWithClient(<SignInForm googleError={code} />);
  expect(screen.getByRole("alert")).toHaveTextContent(message);
});
