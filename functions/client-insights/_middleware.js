// functions/client-insights/_middleware.js
// Guards everything under /client-insights/. If there's no valid session
// cookie, redirect to the login page instead of serving the dashboard.

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Always allow the login page itself through, or you'd never be able to log in.
  if (url.pathname === "/client-insights/login.html" || url.pathname === "/client-insights/login") {
    return next();
  }

  const cookie = request.headers.get("Cookie") || "";
  const hasSession = /client_session=authenticated-/.test(cookie);

  if (!hasSession) {
    return Response.redirect(new URL("/client-insights/login.html", url.origin).toString(), 302);
  }

  return next();
}
