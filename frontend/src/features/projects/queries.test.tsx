import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { useAddRole, useUpdateRole } from "./queries";

// Runs a mutation hook against a stubbed API and returns the query keys it invalidated.
async function invalidatedBy<T extends { mutateAsync: (input: never) => Promise<unknown> }>(
  hook: () => T,
  input: Parameters<T["mutateAsync"]>[0],
  status = 200,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(status === 204 ? null : JSON.stringify({ id: 7 }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const { result } = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await result.current.mutateAsync(input as never);
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const role = { title: "Designer", required_skills: [1] };

test("adding a role refreshes the project and the sidebar's Mine list", async () => {
  const keys = await invalidatedBy(() => useAddRole(4), role);
  expect(keys).toEqual(expect.arrayContaining([["project", 4], ["my-projects"]]));
});

test("editing a role refreshes the project and the sidebar's Mine list", async () => {
  const keys = await invalidatedBy(() => useUpdateRole(4), { roleId: 7, input: role });
  expect(keys).toEqual(expect.arrayContaining([["project", 4], ["my-projects"]]));
});
