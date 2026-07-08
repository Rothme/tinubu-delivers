// functions/admin-reset-client-password.js
// Lets the admin reset the client's password back to the original
// CLIENT_DASHBOARD_PASSWORD env var value, and flags that the client MUST
// choose a new password on their next login.
//
// Protected by ADMIN_RESET_KEY (set this as a Cloudflare env var, same pattern
// as SEED_KEY was set up earlier - pick your own value, keep it private).
// Trigger by visiting: /admin-reset-client-password?key=<ADMIN_RESET_KEY>
//
// NOTE: this is a standalone endpoint for now since the actual admin panel
// UI hasn't been integrated yet. Once admin/index.html is available, this
// should become a button in that panel instead of a URL to visit manually.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.ADMIN_RESET_KEY || key !== env.ADMIN_RESET_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  const kv = env.TD_QR_STATS || env.TD_CACHE;
  if (!kv) return json({ error: "Storage not configured" }, 500);

  await kv.delete("client:password_hash"); // login now falls back to CLIENT_DASHBOARD_PASSWORD env var
  await kv.put("client:must_reset", "true");

  return json({
    ok: true,
    message: "Client password reset. They can now log in with the original CLIENT_DASHBOARD_PASSWORD value, and will be required to set a new password immediately.",
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json" } });
}
