// ── Tinubu Delivers — Cloudflare Pages Function with KV Caching ──────────────
// Cache TTL: 24 hours (86400 seconds)
// KV namespace binding name: TD_CACHE (set in Cloudflare dashboard)
// This reduces API calls from 1-per-user to 1-per-sector/state-per-day

const CACHE_TTL = 86400; // 24 hours in seconds

export async function onRequestPost(context) {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  const kv     = context.env.TD_CACHE; // KV namespace binding

  if (!apiKey) {
    return new Response(JSON.stringify({error:'API key not configured'}), {
      status:500, headers:{'Content-Type':'application/json'}
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({error:'Invalid request body'}), {
      status:400, headers:{'Content-Type':'application/json'}
    });
  }

  // ── BUILD CACHE KEY FROM THE PROMPT ────────────────────────────────────────
  // Extract sector/state name from the prompt to use as cache key
  let cacheKey = null;
  if (kv && body.messages && body.messages[0]) {
    const prompt = body.messages[0].content || '';

    // Detect sector
    const sectorMatch = prompt.match(/in the sector:\s*"([^"]+)"/i);
    if (sectorMatch) {
      cacheKey = 'sector:' + sectorMatch[1].toLowerCase().replace(/\s+/g,'-');
    }

    // Detect state
    const stateMatch = prompt.match(/specifically in (\w[\w\s]+) State,\s*Nigeria/i);
    if (stateMatch) {
      cacheKey = 'state:' + stateMatch[1].toLowerCase().replace(/\s+/g,'-');
    }
  }

  // ── CHECK CACHE FIRST ──────────────────────────────────────────────────────
  if (kv && cacheKey) {
    try {
      const cached = await kv.get(cacheKey, {type:'text'});
      if (cached) {
        // Return cached response — zero API cost
        return new Response(cached, {
          status:200,
          headers:{
            'Content-Type':'application/json',
            'Access-Control-Allow-Origin':'*',
            'X-Cache':'HIT',
            'X-Cache-Key': cacheKey
          }
        });
      }
    } catch(e) {
      // KV read failed — fall through to API call
      console.error('KV read error:', e);
    }
  }

  // ── CALL ANTHROPIC API ─────────────────────────────────────────────────────
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key': apiKey,
      'anthropic-version':'2023-06-01'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  const responseText = JSON.stringify(data);

  // ── STORE IN CACHE IF SUCCESSFUL ───────────────────────────────────────────
  if (kv && cacheKey && response.status === 200 && data.content) {
    try {
      await kv.put(cacheKey, responseText, {expirationTtl: CACHE_TTL});
    } catch(e) {
      console.error('KV write error:', e);
    }
  }

  return new Response(responseText, {
    status: response.status,
    headers:{
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'X-Cache':'MISS',
      'X-Cache-Key': cacheKey || 'none'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers:{
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'
    }
  });
}
