import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

// Runs public/sw.js against a fake worker scope and hands back what it registered.
function loadWorker() {
  const handlers: Record<string, (event: never) => void> = {};
  const cache = { add: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(["teammatch-v0", "teammatch-v1"]),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue("offline page"),
  };
  const self = {
    addEventListener: (type: string, handler: (event: never) => void) => (handlers[type] = handler),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const fetch = vi.fn();
  const Request = vi.fn(function (this: { url: string }, url: string) {
    this.url = url;
  });
  new Function("self", "caches", "fetch", "Request", source)(self, caches, fetch, Request);
  return { handlers, cache, caches, self, fetch };
}

function fetchEvent(url: string, { method = "GET", mode = "navigate" } = {}) {
  return {
    request: { url: `https://teammatch.test${url}`, method, mode },
    respondWith: vi.fn(),
  };
}

test.each([
  ["an API call", "/api/v1/roles/", {}],
  ["an allauth call", "/_allauth/browser/v1/auth/session", {}],
  ["the Google sign-in callback", "/accounts/google/login/callback/?code=1", {}],
  ["the chat socket", "/ws/teams/3/", {}],
  ["a form post to a page", "/feed", { method: "POST" }],
  ["a script", "/_next/static/chunks/main.js", { mode: "no-cors" }],
  ["a client-side data fetch for a page", "/feed?_rsc=1", { mode: "cors" }],
])("leaves %s to the network", (_name, url, init) => {
  const { handlers, fetch } = loadWorker();
  const event = fetchEvent(url, init);

  handlers.fetch(event as never);

  expect(event.respondWith).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("a page load goes to the network and comes back as it is", async () => {
  const { handlers, fetch, caches } = loadWorker();
  fetch.mockResolvedValue("fresh page");
  const event = fetchEvent("/feed");

  handlers.fetch(event as never);

  await expect(event.respondWith.mock.calls[0][0]).resolves.toBe("fresh page");
  expect(fetch).toHaveBeenCalledWith(event.request);
  expect(caches.match).not.toHaveBeenCalled();
});

test("a page load with no network gets the offline page", async () => {
  const { handlers, fetch, caches } = loadWorker();
  fetch.mockRejectedValue(new TypeError("Failed to fetch"));
  const event = fetchEvent("/feed");

  handlers.fetch(event as never);

  await expect(event.respondWith.mock.calls[0][0]).resolves.toBe("offline page");
  expect(caches.match).toHaveBeenCalledWith("/offline.html");
});

test("install stores only the offline page and takes over at once", async () => {
  const { handlers, cache, self } = loadWorker();
  const waitUntil = vi.fn();

  handlers.install({ waitUntil } as never);
  await waitUntil.mock.calls[0][0];

  expect(cache.add).toHaveBeenCalledOnce();
  expect(cache.add.mock.calls[0][0]).toMatchObject({ url: "/offline.html" });
  expect(self.skipWaiting).toHaveBeenCalled();
});

test("activate drops old caches and claims open tabs", async () => {
  const { handlers, caches, self } = loadWorker();
  const waitUntil = vi.fn();

  handlers.activate({ waitUntil } as never);
  await waitUntil.mock.calls[0][0];

  expect(caches.delete).toHaveBeenCalledExactlyOnceWith("teammatch-v0");
  expect(self.clients.claim).toHaveBeenCalled();
});

test("the offline page it stores exists and has a Retry button", () => {
  const page = readFileSync(path.join(process.cwd(), "public/offline.html"), "utf8");
  expect(page).toContain("You're offline.");
  expect(page).toMatch(/<button[^>]*>Retry<\/button>/);
});
