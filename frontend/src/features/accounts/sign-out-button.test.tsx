import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(() => vi.unstubAllGlobals());

test("ends the session and goes to the sign-in page", async () => {
  document.cookie = "csrftoken=test-token";
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response("{}", { status: 401 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient();
  client.setQueryData(["session"], { id: 1, email: "sam@latech.edu" });
  render(
    <QueryClientProvider client={client}>
      <SignOutButton />
    </QueryClientProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/session");
  expect(init?.method).toBe("DELETE");
  expect(client.getQueryData(["session"])).toBeNull();
});
