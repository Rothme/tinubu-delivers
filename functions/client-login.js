// functions/client-login.js
// Handles login for the READ-ONLY client dashboard. Deliberately a separate
// credential from the admin password (env.CLIENT_DASHBOARD_PASSWORD, not
// whatever the admin panel uses) so the client never has admin-level access.
//
// Set CLIENT_DASHBOARD_PASSWORD as an environment variable in Cloudflare Pages
// (Settings -> Environment variables), same way SEED_KEY was set up earlier.

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!env.CLIENT_DASHBOARD_PASSWORD) {
    return json({ error: "Dashboard password not configured" }, 500);
  }

  if (body.password !== env.CLIENT_DASHBOARD_PASSWORD) {
    return json({ error: "Incorrect password" }, 401);
  }

  // Simple session token - not a JWT, just a value the middleware checks for.
  // Good enough for a low-stakes read-only view; if this ever needs to be more
  // rigorous (e.g. multiple client users with different access), it should be
  // upgraded to proper signed sessions.
  const sessionValue = "authenticated-" + Date.now();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Set-Cookie": `client_session=${sessionValue}; Path=/client-insights; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
    },
  });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
