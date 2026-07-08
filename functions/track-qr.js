// functions/track-qr.js
// Cloudflare Pages Function - logs a QR scan and redirects to the real destination.
//
// How it works: instead of QR codes pointing straight at /delivers?qr=tag,
// they point at /track-qr?tag=lagos-rally-2026 . This function logs the scan
// (increments the all-time total, increments this tag's own total, records
// first/last-seen timestamps) then redirects the visitor on to /delivers/ -
// so the tracking is invisible to the person scanning, it just adds one fast
// server-side hop.
//
// KV keys used (all in your existing TD_CACHE namespace, or a separate
// TD_QR_STATS namespace if you'd rather keep tracking data apart from content):
//   qr:total                -> a single integer, all-time scan count across ALL QR codes
//   qr:tag:<tag>            -> JSON { count, firstSeen, lastSeen, label }
//   qr:registry             -> JSON array of all registered tags (for listing in admin/client UI)

const ALERT_THRESHOLD = 40_000_000;
const HARD_CAP = 50_000_000;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag") || "untagged";
  const kv = env.TD_QR_STATS || env.TD_CACHE; // falls back to your existing namespace if a separate one isn't set up

  if (kv) {
    try {
      // Increment all-time total
      const currentTotalRaw = await kv.get("qr:total");
      const currentTotal = currentTotalRaw ? parseInt(currentTotalRaw, 10) : 0;
      const newTotal = currentTotal + 1;
      await kv.put("qr:total", String(newTotal));

      // Increment this specific tag's stats
      const tagKey = `qr:tag:${tag}`;
      const existingRaw = await kv.get(tagKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : { count: 0, firstSeen: new Date().toISOString(), label: tag };
      existing.count += 1;
      existing.lastSeen = new Date().toISOString();
      await kv.put(tagKey, JSON.stringify(existing));

      // Keep a registry of all tags seen, so the admin/client UI can list them without scanning all keys
      const registryRaw = await kv.get("qr:registry");
      const registry = registryRaw ? JSON.parse(registryRaw) : [];
      if (!registry.includes(tag)) {
        registry.push(tag);
        await kv.put("qr:registry", JSON.stringify(registry));
      }
    } catch (e) {
      console.error("QR tracking error:", e);
      // Do NOT block the redirect if tracking fails - the visitor should never see a broken link
      // because of a logging problem.
    }
  }

  // Always redirect to the real destination, tracking success or failure notwithstanding.
  const destination = url.searchParams.get("dest") || "/delivers/";
  return Response.redirect(new URL(destination, url.origin).toString(), 302);
}
