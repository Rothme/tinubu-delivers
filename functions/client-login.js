// functions/client-login.js
// Handles login for the READ-ONLY client dashboard.
//
// Password storage: KV holds a hashed password under "client:password_hash".
// On first-ever login (before anyone has set a password), it falls back to
// comparing against env.CLIENT_DASHBOARD_PASSWORD - so that env var is really
// just the INITIAL password. Once the user changes their password (or admin
// resets it), KV takes over and the env var is no longer used.

import { hashPassword } from "./_shared/password.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const kv = env.TD_QR_STATS || env.TD_CACHE;
  if (!kv) return json({ error: "Storage not configured" }, 500);

  const storedHash = await kv.get("client:password_hash");
  const mustSetNewPassword = (await kv.get("client:must_reset")) === "true";

  let passwordCorrect = false;
  if (storedHash) {
    const submittedHash = await hashPassword(body.password);
    passwordCorrect = submittedHash === storedHash;
  } else if (env.CLIENT_DASHBOARD_PASSWORD) {
    // No password ever set in KV yet - fall back to the initial env var password.
    passwordCorrect = body.password === env.CLIENT_DASHBOARD_PASSWORD;
  }

  if (!passwordCorrect) {
    return json({ error: "Incorrect password" }, 401);
  }

  const sessionValue = "authenticated-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  return new Response(JSON.stringify({ ok: true, mustSetNewPassword }), {
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

