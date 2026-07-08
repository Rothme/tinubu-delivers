// functions/qr-stats.js
// Read-only Cloudflare Pages Function. Returns current QR scan totals as JSON.
// Used by BOTH the admin panel and the client dashboard - it's the same data,
// just displayed differently (admin gets edit controls elsewhere; this endpoint
// itself never writes anything, so it's safe to expose to a read-only client view).

const ALERT_THRESHOLD = 40_000_000;
const HARD_CAP = 50_000_000;

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.TD_QR_STATS || env.TD_CACHE;

  if (!kv) {
    return json({ error: "KV namespace not configured" }, 500);
  }

  const totalRaw = await kv.get("qr:total");
  const total = totalRaw ? parseInt(totalRaw, 10) : 0;

  const registryRaw = await kv.get("qr:registry");
  const registry = registryRaw ? JSON.parse(registryRaw) : [];

  const tags = [];
  for (const tag of registry) {
    const raw = await kv.get(`qr:tag:${tag}`);
    if (raw) tags.push({ tag, ...JSON.parse(raw) });
  }
  tags.sort((a, b) => b.count - a.count); // highest-traffic QR codes first

  return json({
    total,
    alertThreshold: ALERT_THRESHOLD,
    hardCap: HARD_CAP,
    alertActive: total >= ALERT_THRESHOLD,
    percentOfCap: Math.min(100, Math.round((total / HARD_CAP) * 1000) / 10),
    tags,
    generatedAt: new Date().toISOString(),
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
