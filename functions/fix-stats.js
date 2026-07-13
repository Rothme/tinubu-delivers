// functions/fix-stats.js
// ONE-TIME ADMIN SCRIPT — run once, then delete this file (same pattern as seed.js).
// Reads each sector's existing KV entry, injects a real `stats` array built from
// figures already present in the verified achievements data, and writes it back.
// Does not touch headline, achievements, other_achievements, quote, or source.
//
// Run: GET /fix-stats?key=RUNONCE

const SECRET = "RUNONCE";

const STATS_BY_SECTOR = {
  "sector:agriculture": [
    { value: "40,000 ha", label: "Wheat programme farmland", caption: "80,000 farmers" },
    { value: "\u20a6160bn", label: "Projected wheat output" },
    { value: "2,000", label: "Tractors distributed", caption: "mechanisation launch" },
    { value: "550,000 ha", label: "Mechanisation target area" }
  ],
  "sector:aviation-transport": [
    { value: "100,000+", label: "Vehicles converted to CNG/EV" },
    { value: "75+", label: "CNG refuelling stations" },
    { value: "337+", label: "Conversion centres" },
    { value: "7,700", label: "Technicians trained" }
  ],
  "sector:digital-economy": [
    { value: "160,000+", label: "3MTT fellows trained", caption: "3 cohorts" },
    { value: "1.87m", label: "3MTT registered / pipeline" },
    { value: "90,000km", label: "Project BRIDGE fibre laid", caption: "target 120,000km" },
    { value: "$100m", label: "EBRD financing secured" }
  ],
  "sector:economy-finance": [
    { value: "\u20a62.30tn", label: "May 2026 FAAC distribution" },
    { value: "\u20a61.61tn", label: "Statutory revenue share" },
    { value: "+25.85%", label: "Jan\u2013May 2026 FAAC growth", caption: "vs Jan\u2013May 2025" },
    { value: "\u20a6688.79bn", label: "VAT share, May 2026" }
  ],
  "sector:education": [
    { value: "\u20a6303.91bn", label: "NELFUND cumulative disbursed", caption: "1.64m beneficiaries" },
    { value: "1,197,626", label: "NELFUND registered students" },
    { value: "3,138,390", label: "NELFUND loan applications" },
    { value: "1,133 days", label: "No national ASUU strike", caption: "since May 2023" }
  ],
  "sector:foreign-policy": [
    { value: "$5bn", label: "Africa Energy Bank initial capital", caption: "HQ in Abuja" },
    { value: "BRICS", label: "Nigeria accepted as partner country" },
    { value: "UAE", label: "Flights & visa deal resumed" }
  ],
  "sector:health": [
    { value: "\u20a6235bn", label: "BHCPF disbursed to PHCs", caption: "of \u20a6339bn total" },
    { value: "130,000+", label: "Reached via emergency medical services" },
    { value: "3,000+", label: "PHCs upgraded to Level 2" },
    { value: "22m+", label: "Health insurance enrollees", caption: "up from ~16m" }
  ],
  "sector:housing-urban-dev": [
    { value: "6", label: "Geopolitical zones with dev commissions" },
    { value: "5", label: "States, South-East Commission" },
    { value: "7", label: "States, North-West Commission" },
    { value: "6", label: "States, South-West Commission" }
  ],
  "sector:infrastructure": [
    { value: "\u20a63.9tn", label: "Road contracts approved (FEC)", caption: "27 projects, 15 states" },
    { value: "30km", label: "Coastal Highway Section I commissioned", caption: "of 40.7km" },
    { value: "700km", label: "Planned coastal corridor length" },
    { value: "125km", label: "Superhighway first phase", caption: "Akwanga\u2013Jos" }
  ],
  "sector:power-energy": [
    { value: "148MW", label: "Renewed Hope Solarisation total", caption: "37 universities + 37 hospitals" },
    { value: "\u20a6220bn", label: "Solarisation pipeline investment" },
    { value: "100MW+", label: "Across 72 PHCs & institutions" },
    { value: "\u20a63.8bn", label: "ADUSTECH Wudil solar project" }
  ],
  "sector:security": [
    { value: "13,543", label: "Insurgents neutralised (NSA)", caption: "since 2023" },
    { value: "124,408", label: "Fighters/dependents surrendered" },
    { value: "50+", label: "Bandit kingpins killed, North-West" },
    { value: "11,250", label: "Hostages freed, North-West" }
  ],
  "sector:social-safety-net": [
    { value: "\u20a6419bn", label: "CCT disbursed", caption: "5.91m households" },
    { value: "1,000,000", label: "Nano-business grant target", caption: "\u20a650,000 each" },
    { value: "600,000+", label: "Nano-businesses funded so far" },
    { value: "75,000", label: "MSME loan beneficiaries processed" }
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

  const results = [];
  for (const [cacheKey, stats] of Object.entries(STATS_BY_SECTOR)) {
    const raw = await kv.get(cacheKey);
    if (!raw) {
      results.push({ cacheKey, status: "SKIPPED - no existing entry found" });
      continue;
    }
    try {
      const data = JSON.parse(raw);
      data.stats = stats;
      await kv.put(cacheKey, JSON.stringify(data));
      results.push({ cacheKey, status: "UPDATED", statCount: stats.length });
    } catch (e) {
      results.push({ cacheKey, status: "ERROR", message: e.message });
    }
  }

  return json({ done: true, results }, 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}