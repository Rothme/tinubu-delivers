// functions/client-change-password.js
// Lets an ALREADY-LOGGED-IN client user set a new password. Requires a valid
// session cookie (checked by the _middleware.js guard on /client-insights/,
// but this endpoint itself is outside that path, so it re-checks here too).
// No email confirmation - the person is already authenticated via session,
// so a new password takes effect immediately.

import { hashPassword } from "./_shared/password.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const cookie = request.headers.get("Cookie") || "";
  if (!/client_session=authenticated-/.test(cookie)) {
    return json({ error: "Not logged in" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!body.newPassword || body.newPassword.length < 6) {
    return json({ error: "Password must be at least 6 characters" }, 400);
  }

  const kv = env.TD_QR_STATS || env.TD_CACHE;
  if (!kv) return json({ error: "Storage not configured" }, 500);

  const newHash = await hashPassword(body.newPassword);
  await kv.put("client:password_hash", newHash);
  await kv.put("client:must_reset", "false"); // clear any pending forced-reset flag

  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
