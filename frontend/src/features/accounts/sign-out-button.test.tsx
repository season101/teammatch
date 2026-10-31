import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// jsdom has no modal dialog behaviour, so stand in for what browsers do.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function renderButton() {
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
  return { fetchMock, client };
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

test("asks first, then ends the session and goes to the landing page", async () => {
  const { fetchMock, client } = renderButton();

  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  const dialog = screen.getByRole("dialog", { name: "Log out of TeamMatch?" });
  expect(dialog).toHaveTextContent("You can sign back in with the same email.");
  fireEvent.click(within(dialog).getByRole("button", { name: "Log out" }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/_allauth/browser/v1/auth/session");
  expect(init?.method).toBe("DELETE");
  expect(client.getQueryData(["session"])).toBeNull();
});

test("Cancel keeps you signed in", () => {
  const { fetchMock } = renderButton();

  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});
