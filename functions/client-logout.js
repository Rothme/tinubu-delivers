// functions/client-logout.js
// Clears the session cookie. GET so it can be triggered by a simple link/button.

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      "Location": new URL("/client-insights/login.html", url.origin).toString(),
      "Set-Cookie": "client_session=; Path=/client-insights; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
    },
  });
}
