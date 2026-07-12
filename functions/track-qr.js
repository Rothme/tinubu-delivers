// functions/track-qr.js
// Cloudflare Pages Function - logs a QR scan and redirects to the real destination.
//
// How it works: QR codes point at /track-qr?tag=<refCode> (no destination baked in).
// This function logs the scan (all-time total, per-tag total, first/last-seen),
// then redirects the visitor on to the CURRENT live destination - so the tracking
// is invisible to the person scanning, it just adds one fast server-side hop.
//
// DESTINATION RESOLUTION ORDER (first one found wins):
//   1. ?dest= query param on the request itself (manual override, rarely used)
//   2. qr:destination key in KV (the one you'd edit if the site ever moves)
//   3. "/delivers/" hardcoded fallback (only used if KV has never been set)
//
// This means: if the site's path/domain ever changes, you update ONE KV value
// and every QR code already printed - t-shirts, stickers, billboards - starts
// resolving to the new destination automatically. No reprinting required.
//
// To update the destination:
//   npx wrangler pages secret ... (or via Cloudflare dashboard -> Workers & Pages
//   -> your project -> KV -> TD_CACHE -> add/edit key "qr:destination")
//   Value should be a path like "/delivers/" or a full URL like
//   "https://newdomain.com.ng/delivers/"
//
// KV keys used (all in your existing TD_CACHE namespace, or a separate
// TD_QR_STATS namespace if you'd rather keep tracking data apart from content):
//   qr:total                -> a single integer, all-time scan count across ALL QR codes
//   qr:tag:<tag>            -> JSON { count, firstSeen, lastSeen, label }
//   qr:registry             -> JSON array of all registered tags (for listing in admin/client UI)
//   qr:destination          -> string, current redirect target (path or full URL)

const ALERT_THRESHOLD = 40_000_000;
const HARD_CAP = 50_000_000;
const DEFAULT_DESTINATION = "/delivers/";

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

  // Resolve destination: query override > KV-configured value > hardcoded default.
  // Always redirect, even if tracking above failed - a logging problem should never
  // become a broken link for the person who scanned.
  let destination = url.searchParams.get("dest");
  if (!destination && kv) {
    try {
      destination = await kv.get("qr:destination");
    } catch (e) {
      console.error("QR destination lookup error:", e);
    }
  }
  if (!destination) destination = DEFAULT_DESTINATION;

  return Response.redirect(new URL(destination, url.origin).toString(), 302);
}
