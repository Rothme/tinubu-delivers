// functions/seed.js — CORRECTED VERSION
// Deploy, hit GET /seed?key=YOUR_SEED_KEY once, confirm the response, then delete this file.
//
// Writes 49 entries into TD_CACHE using the EXACT key format your existing claude.js expects
// (including the "&" in sector keys like "sector:economy-&-finance", and "state:fct-abuja"
// rather than "state:fct"). Each value is shaped exactly like a real Anthropic API response
// so your existing, unmodified render code in index.html reads it with zero changes.

import ALL_ENTRIES from "./seed-payload-v2.json";

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
      await env.TD_CACHE.put(cacheKey, JSON.stringify(entry)); // no TTL = permanent
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
    reminder: "Delete functions/seed.js and functions/seed-payload-v2.json now, then commit and push.",
  }, null, 2), { headers: { "content-type": "application/json" } });
}
