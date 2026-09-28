import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { HealthStatus } from "./health-status";

function renderWithQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HealthStatus />
    </QueryClientProvider>,
  );
}

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

const check = { ok: true, latency_ms: 1.2, error: null };

test("shows all green when the API reports ok", async () => {
  mockFetch({ status: "ok", version: "dev", checks: { database: check, redis: check } });
  renderWithQuery();
  expect(await screen.findByText("All systems go")).toBeInTheDocument();
  expect(screen.getByText("vdev")).toBeInTheDocument();
});

test("shows which dependency is down", async () => {
  mockFetch({
    status: "degraded",
    version: "dev",
    checks: { database: check, redis: { ok: false, latency_ms: 2, error: "ConnectionError" } },
  });
  renderWithQuery();
  expect(await screen.findByText("Degraded")).toBeInTheDocument();
  expect(screen.getByText("ConnectionError")).toBeInTheDocument();
});

test("says the API is unreachable when the request fails", async () => {
  mockFetch({}, 502);
  renderWithQuery();
  expect(await screen.findByText("API unreachable")).toBeInTheDocument();
});
