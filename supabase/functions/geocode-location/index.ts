import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 220);
}
function clean(value: unknown) { return String(value ?? "").trim(); }
function canonical(value: string) {
  return value
    .replace(/\bchattarpur\b/ig, "Chhatarpur")
    .replace(/\bgurgaon\b/ig, "Gurugram")
    .replace(/\bsec(?:tor)?[ .-]*(\d+[a-z]?)\b/ig, "Sector $1")
    .replace(/\bdlf\s*phase[ .-]*(\d+)\b/ig, "DLF Phase $1")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}
function uniq(values: string[]) {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))];
}
async function nominatim(query: string) {
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "in");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("viewbox", "76.65,29.25,77.75,28.05");
  endpoint.searchParams.set("bounded", "1");
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "SelectMyVenue-CRM/1.0 (https://selectmyvenue.com)",
      "Accept-Language": "en"
    }
  });
  if (!response.ok) return null;
  const results = await response.json();
  const hit = Array.isArray(results) ? results[0] : null;
  if (!hit) return null;
  const lat = Number(hit.lat), lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon, display_name: String(hit.display_name || ""), provider: "nominatim" };
}
async function photon(query: string) {
  const endpoint = new URL("https://photon.komoot.io/api/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("bbox", "76.65,28.05,77.75,29.25");
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "SelectMyVenue-CRM/1.0 (https://selectmyvenue.com)",
      "Accept": "application/json"
    }
  });
  if (!response.ok) return null;
  const data = await response.json();
  const hit = Array.isArray(data?.features) ? data.features[0] : null;
  const coords = hit?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = Number(coords[0]), lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const p = hit.properties || {};
  const label = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean).join(", ");
  return { latitude: lat, longitude: lon, display_name: label, provider: "photon" };
}


function normalizedWords(value: string) {
  return canonical(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function requestedSector(value: string) {
  const m = normalizedWords(value).match(/\bsector\s*(\d+[a-z]?)\b/);
  return m ? m[1] : "";
}
function contextFamily(value: string) {
  const t = normalizedWords(value);
  if (/\b(gurgaon|gurugram|manesar)\b/.test(t)) return "gurugram";
  if (/\bgreater noida\b/.test(t)) return "greater noida";
  if (/\bnoida\b/.test(t)) return "noida";
  if (/\bfaridabad\b/.test(t)) return "faridabad";
  if (/\bghaziabad\b/.test(t)) return "ghaziabad";
  if (/\bdelhi\b/.test(t)) return "delhi";
  return "";
}
function hitMatchesRequest(query: string, context: string, displayName: string) {
  const wantedSector = requestedSector(query);
  const display = normalizedWords(displayName);
  if (wantedSector && !new RegExp("\\bsector\\s*" + wantedSector + "\\b", "i").test(display)) return false;
  const family = contextFamily(context);
  if (family === "gurugram" && !/\b(gurgaon|gurugram)\b/.test(display)) return false;
  if (family === "greater noida" && !/\bgreater noida\b/.test(display)) return false;
  if (family === "noida" && !/\bnoida\b/.test(display)) return false;
  if (family === "faridabad" && !/\bfaridabad\b/.test(display)) return false;
  if (family === "ghaziabad" && !/\bghaziabad\b/.test(display)) return false;
  if (family === "delhi" && !/\bdelhi\b/.test(display)) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const raw = clean(body?.q);
    const context = canonical(clean(body?.context));
    if (!raw || raw.length > 300) {
      return new Response(JSON.stringify({ error: "A valid location query is required" }), { status: 400, headers: corsHeaders });
    }

    const canonicalRaw = canonical(raw.replace(/\bdelhi\s*ncr\b/ig, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim());
    const cacheSeed = [canonicalRaw, context].filter(Boolean).join(" | ");
    const cacheKey = normalizeKey(cacheSeed);
    if (!cacheKey) return new Response(JSON.stringify({ error: "Invalid location query" }), { status: 400, headers: corsHeaders });

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceRole);

    const { data: cached } = await admin
      .from("geocode_cache")
      .select("latitude,longitude,display_name,provider,updated_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cached && hitMatchesRequest(canonicalRaw, context, String(cached.display_name || ""))) {
      return new Response(JSON.stringify({ ok: true, cached: true, ...cached }), { headers: corsHeaders });
    } else if (cached) {
      await admin.from("geocode_cache").delete().eq("cache_key", cacheKey);
    }

    const candidates = uniq([
      context ? `${canonicalRaw}, ${context}, India` : "",
      `${canonicalRaw}, Delhi, India`,
      `${canonicalRaw}, Gurugram, Haryana, India`,
      `${canonicalRaw}, Noida, Uttar Pradesh, India`,
      `${canonicalRaw}, Faridabad, Haryana, India`,
      `${canonicalRaw}, Ghaziabad, Uttar Pradesh, India`
    ]);

    let hit: any = null;
    // Nominatim first for structured locality precision. Limit attempts to two to stay gentle.
    for (const candidate of candidates.slice(0, 2)) {
      hit = await nominatim(candidate);
      if (hit && !hitMatchesRequest(canonicalRaw, context, hit.display_name)) hit = null;
      if (hit) break;
      await new Promise(r => setTimeout(r, 1050));
    }

    // Photon is the fuzzy fallback for misspellings/locality variants.
    if (!hit) {
      for (const candidate of candidates.slice(0, 4)) {
        hit = await photon(candidate);
        if (hit && !hitMatchesRequest(canonicalRaw, context, hit.display_name)) hit = null;
        if (hit) break;
      }
    }

    if (!hit) {
      return new Response(JSON.stringify({ ok: false, not_found: true, query: canonicalRaw }), { headers: corsHeaders });
    }

    const payload = {
      cache_key: cacheKey,
      query_text: candidates[0] || canonicalRaw,
      latitude: hit.latitude,
      longitude: hit.longitude,
      display_name: hit.display_name,
      provider: hit.provider,
      updated_at: new Date().toISOString()
    };

    await admin.from("geocode_cache").upsert(payload, { onConflict: "cache_key" });

    return new Response(JSON.stringify({
      ok: true,
      cached: false,
      latitude: payload.latitude,
      longitude: payload.longitude,
      display_name: payload.display_name,
      provider: payload.provider
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: corsHeaders });
  }
});