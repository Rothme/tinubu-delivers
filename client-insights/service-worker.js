// client-insights/service-worker.js
// Minimal, conservative service worker - just enough to make the app
// installable. It ONLY ever touches the exact shell files listed below.
// Every other request (POST logins, /qr-stats, images, anything else) is
// passed straight through to the network untouched - the fetch handler
// does nothing at all for those, which is the safest possible behavior.
//
// CACHE_NAME is versioned - bump this number any time shell files change,
// so browsers with an old worker installed pick up the new one instead of
// silently keeping stale cached content.

const CACHE_NAME = "td-insights-shell-v2";
const SHELL_FILES = ["/client-insights/login.html", "/client-insights/manifest.json"];

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
  // Only ever intercept GET requests for the exact shell files. Everything
  // else - POST requests, /qr-stats, images, the dashboard page itself -
  // is left completely alone and goes straight to the network as normal.
  if (event.request.method !== "GET") return;

  const path = new URL(event.request.url).pathname;
  if (!SHELL_FILES.includes(path)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

