import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { OnboardingGate } from "./gate";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const USER = { id: 1, email: "sam@latech.edu" };

function renderGate(user: unknown, profile?: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], user);
  if (profile) client.setQueryData(["my-profile"], profile);
  render(
    <QueryClientProvider client={client}>
      <OnboardingGate />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

test("an account that hasn't agreed to the rules goes to Team rules", async () => {
  renderGate(USER, { rules_accepted_at: null });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome/rules"));
});

test("an account that has agreed stays where it is", () => {
  renderGate(USER, { rules_accepted_at: "2026-11-11T10:00:00Z" });
  expect(replace).not.toHaveBeenCalled();
});

test("no redirect while the profile is still loading", () => {
  const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
  vi.stubGlobal("fetch", fetchMock);
  renderGate(USER);

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(replace).not.toHaveBeenCalled();
});

test("no redirect and no profile request for a signed-out visitor", () => {
  const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
  vi.stubGlobal("fetch", fetchMock);
  renderGate(null);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});

test("a signed-out visitor isn't moved by a profile left in the cache", () => {
  renderGate(null, { rules_accepted_at: null });
  expect(replace).not.toHaveBeenCalled();
});
