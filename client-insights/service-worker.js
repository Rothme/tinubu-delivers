// client-insights/service-worker.js
// Deliberately minimal. Earlier versions tried to cache login.html itself as
// part of an "app shell" - that triggers a real browser restriction: you
// cannot serve a cached response for a page navigation if that response was
// ever the result of a redirect ("a redirected response was used for a
// request whose redirect mode is not 'follow'"). Rather than fight that,
// this version never touches HTML pages or navigations at all. It only
// caches the manifest and icon - small static files that are never subject
// to that restriction - which is already enough to satisfy "installable as
// an app" requirements. Every page load (login, dashboard) always goes
// straight to the network, every time, with zero risk of serving something
// stale or broken.

const CACHE_NAME = "td-insights-shell-v3";
const SHELL_FILES = ["/client-insights/manifest.json", "/client-insights/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((err) => console.error("SW install cache failed:", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never touch navigation requests (loading a page/HTML) - always network.
  if (event.request.mode === "navigate") return;
  if (event.request.method !== "GET") return;

  const path = new URL(event.request.url).pathname;
  if (!SHELL_FILES.includes(path)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});


