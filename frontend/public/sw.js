// Why this exists: installing on Android no longer strictly needs a service worker, but the
// offline page is what keeps a home-screen app from showing the browser's error page.
// Bump the version when offline.html changes; old caches go on activate.
const CACHE = "teammatch-v1";
const OFFLINE = "/offline.html";
// Django's paths (see next.config.ts and the Traefik rule). Never touched here.
const BACKEND = /^\/(api|_allauth|accounts|ws|admin|static)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Page loads only, network first, nothing stored: signed-in pages are never served stale.
// Everything else (API, sockets, scripts, images, non-GET) goes straight to the network.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  if (BACKEND.test(new URL(request.url).pathname)) return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
});
