// functions/client-insights/_middleware.js
// Guards everything under /client-insights/. If there's no valid session
// cookie, redirect to the login page instead of serving the dashboard.

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Always allow the login page and PWA assets through - a browser needs to fetch
  // the manifest, icons, and service worker BEFORE login to offer "Install App",
  // and none of them expose any actual usage data.
  const publicPaths = [
    "/client-insights/login.html",
    "/client-insights/login",
    "/client-insights/manifest.json",
    "/client-insights/service-worker.js",
    "/client-insights/icon-192.png",
    "/client-insights/icon-512.png",
  ];
  if (publicPaths.includes(url.pathname)) {
    return next();
  }

  const cookie = request.headers.get("Cookie") || "";
  const hasSession = /client_session=authenticated-/.test(cookie);

  if (!hasSession) {
    return Response.redirect(new URL("/client-insights/login.html", url.origin).toString(), 302);
  }

  return next();
}
