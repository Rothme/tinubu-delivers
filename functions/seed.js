// functions/seed.js
// ONE-TIME USE. Deploy this file, hit GET /seed?key=YOUR_SEED_KEY once, confirm the response,
// then DELETE this file and redeploy — same working rule you already use.
//
// It does not generate or alter any content. It writes the 49 pre-built, source-checked
// entries from seed-payload.json verbatim into TD_CACHE, keyed by cacheKey, with no TTL
// (matches your existing permanent-cache pattern).
//
// SEED_KEY is a Cloudflare Pages environment variable/secret you set yourself (Pages
// dashboard -> Settings -> Environment variables). This just stops the endpoint from being
// triggered by a stray visitor or crawler while it's live. Set it to any random string.

import ALL_ENTRIES from "./seed-payload.json";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const providedKey = url.searchParams.get("key");

  if (!env.SEED_KEY || providedKey !== env.SEED_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized. Pass ?key=<SEED_KEY>." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const results = [];
  for (const [cacheKey, entry] of Object.entries(ALL_ENTRIES)) {
    try {
      await env.TD_CACHE.put(cacheKey, JSON.stringify(entry)); // no expirationTtl = permanent
      results.push({ key: cacheKey, status: "ok" });
    } catch (err) {
      results.push({ key: cacheKey, status: "error", message: String(err) });
    }
  }

  const failed = results.filter(r => r.status !== "ok");

  return new Response(JSON.stringify({
    seeded: results.length,
    failed: failed.length,
    failures: failed,
    reminder: "Delete this file and redeploy now that seeding is confirmed.",
  }, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
