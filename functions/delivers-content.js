// functions/delivers-content.js
// Replaces the generation-on-cache-miss behaviour of the old functions/claude.js.
//
// This endpoint NEVER calls the Claude API to write factual content. It is a straight
// read from TD_CACHE. If the requested sector/state isn't in the cache, it returns an
// honest "not verified yet" response instead of generating something plausible-sounding.
//
// Expected calls from delivers/index.html (adjust the two lines marked ADAPT to match
// however your frontend currently requests sector/state data):
//   GET /delivers-content?type=sector&slug=economy-finance
//   GET /delivers-content?type=state&slug=lagos

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");   // ADAPT: "sector" | "state"
  const slug = url.searchParams.get("slug");   // ADAPT: e.g. "economy-finance", "lagos"

  if (!type || !slug || !["sector", "state"].includes(type)) {
    return json({ error: "Missing or invalid 'type' (sector|state) or 'slug' parameter." }, 400);
  }

  const cacheKey = `${type}:${slug}`;
  const raw = await env.TD_CACHE.get(cacheKey);

  if (!raw) {
    // Honest miss. No generation, no fallback content.
    return json({
      available: false,
      cacheKey,
      message: "No verified content is currently available for this selection. It will appear once added to the verified dataset.",
    }, 200);
  }

  const data = JSON.parse(raw);
  return json({ available: true, ...data }, 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300", // short edge cache; KV itself is the permanent store
    },
  });
}
