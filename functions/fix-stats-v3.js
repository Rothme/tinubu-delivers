// functions/fix-stats-v3.js
const SECRET = "RUNONCE3";

const STATS_BY_SECTOR = {
  "sector:education": [
    { value: "\u20a6303.91bn", label: "NELFUND cumulative disbursed", caption: "1.64m beneficiaries" },
    { value: "1,197,626", label: "NELFUND registered students" },
    { value: "3,138,390", label: "NELFUND loan applications" },
    { value: "1,133 days", label: "No national ASUU strike", caption: "since May 2023" }
  ]
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== SECRET) {
    return json({ error: "Missing or invalid ?key=" }, 403);
  }

  const kv = env.TD_CACHE;
  if (!kv) return json({ error: "TD_CACHE binding not found" }, 500);

  const cacheKey = "sector:education";
  const stats = STATS_BY_SECTOR[cacheKey];

  const beforeRaw = await kv.get(cacheKey);
  if (!beforeRaw) return json({ error: "No existing entry for " + cacheKey }, 404);

  let outer;
  try {
    outer = JSON.parse(beforeRaw);
  } catch (e) {
    return json({ error: "Could not parse existing KV value", raw: beforeRaw.slice(0, 200) }, 500);
  }

  const shapeDetected = (outer && outer.content && outer.content[0] && typeof outer.content[0].text === "string")
    ? "nested"
    : (outer && typeof outer.sector !== "undefined")
      ? "flat"
      : "unknown";

  if (shapeDetected === "unknown") {
    return json({ error: "Unrecognised shape", topLevelKeys: Object.keys(outer || {}) }, 500);
  }

  let newOuterString;
  if (shapeDetected === "nested") {
    const inner = JSON.parse(outer.content[0].text);
    inner.stats = stats;
    outer.content[0].text = JSON.stringify(inner);
    if ("stats" in outer) delete outer.stats;
    newOuterString = JSON.stringify(outer);
  } else {
    outer.stats = stats;
    newOuterString = JSON.stringify(outer);
  }

  const putResult = await kv.put(cacheKey, newOuterString);

  const afterRaw = await kv.get(cacheKey);
  const afterParsed = afterRaw ? JSON.parse(afterRaw) : null;
  const afterStatsWhereFrontendReadsIt = shapeDetected === "nested"
    ? (afterParsed && afterParsed.content && afterParsed.content[0]
        ? JSON.parse(afterParsed.content[0].text).stats
        : null)
    : (afterParsed ? afterParsed.stats : null);

  return json({
    cacheKey,
    shapeDetected,
    wroteBytes: newOuterString.length,
    readBackImmediately: {
      matchesWhatWeWrote: afterRaw === newOuterString,
      statsAsFrontendWouldSeeThem: afterStatsWhereFrontendReadsIt
    }
  }, 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}