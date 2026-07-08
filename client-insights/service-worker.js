// client-insights/service-worker.js
// Minimal service worker - just enough to make the app installable and give
// it a basic offline fallback for the shell (the login page). Data (the live
// scan counts) is NEVER cached - it always fetches fresh from /qr-stats, so
// the numbers you see are always current, never stale from a cache.

const CACHE_NAME = "td-insights-shell-v1";
const SHELL_FILES = ["/client-insights/login.html", "/client-insights/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
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
  const url = new URL(event.request.url);

  // Never cache live data endpoints - always go to the network for these.
  if (url.pathname === "/qr-stats" || url.pathname.startsWith("/client-insights/")
      && !SHELL_FILES.includes(url.pathname)) {
    return; // let the browser handle it normally (network)
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
