import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

type Point = { id?: string | number; lat: number; lon: number };

function validPoint(p: any): p is Point {
  return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) &&
    Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lon)) <= 180 &&
    !(Math.abs(Number(p.lat)) < 0.000001 && Math.abs(Number(p.lon)) < 0.000001);
}

function round5(v: number) { return Number(v).toFixed(5); }
function keyFor(a: Point, b: Point) {
  return ["driving", round5(a.lat), round5(a.lon), round5(b.lat), round5(b.lon)].join("|");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const origin = body?.origin as Point;
    const destinations = Array.isArray(body?.destinations) ? body.destinations.slice(0, 25) as Point[] : [];

    if (!validPoint(origin) || !destinations.length || destinations.some(p => !validPoint(p))) {
      return new Response(JSON.stringify({ error: "Valid origin and destinations are required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const keys = destinations.map(d => keyFor(origin, d));
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: cachedRows } = await admin
      .from("route_distance_cache")
      .select("cache_key,distance_m,duration_s,provider,updated_at")
      .in("cache_key", keys)
      .gte("updated_at", cutoff);

    const cached = new Map((cachedRows || []).map((r: any) => [r.cache_key, r]));
    const result: any[] = destinations.map((d, i) => {
      const row: any = cached.get(keys[i]);
      return row ? {
        id: d.id ?? String(i),
        ok: Number.isFinite(Number(row.distance_m)),
        distance_m: row.distance_m,
        duration_s: row.duration_s,
        provider: row.provider || "osrm",
        cached: true
      } : null;
    });

    const missingIndexes = result.map((r, i) => r ? -1 : i).filter(i => i >= 0);

    if (missingIndexes.length) {
      const coords = [origin, ...missingIndexes.map(i => destinations[i])]
        .map(p => `${Number(p.lon)},${Number(p.lat)}`)
        .join(";");

      const destinationIndexes = missingIndexes.map((_, i) => i + 1).join(";");
      const endpoint = new URL(`https://router.project-osrm.org/table/v1/driving/${coords}`);
      endpoint.searchParams.set("sources", "0");
      endpoint.searchParams.set("destinations", destinationIndexes);
      endpoint.searchParams.set("annotations", "distance,duration");

      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": "SelectMyVenue-CRM/1.0 (https://selectmyvenue.com)",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Road routing provider returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.code !== "Ok") throw new Error(data?.message || "Road route unavailable");

      const distances = Array.isArray(data?.distances?.[0]) ? data.distances[0] : [];
      const durations = Array.isArray(data?.durations?.[0]) ? data.durations[0] : [];
      const cachePayload: any[] = [];

      missingIndexes.forEach((originalIndex, j) => {
        const d = destinations[originalIndex];
        const distance = Number(distances[j]);
        const duration = Number(durations[j]);
        const ok = Number.isFinite(distance) && distance >= 0;
        result[originalIndex] = {
          id: d.id ?? String(originalIndex),
          ok,
          distance_m: ok ? Math.round(distance) : null,
          duration_s: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
          provider: "osrm",
          cached: false
        };
        if (ok) {
          cachePayload.push({
            cache_key: keys[originalIndex],
            origin_lat: Number(origin.lat),
            origin_lon: Number(origin.lon),
            destination_lat: Number(d.lat),
            destination_lon: Number(d.lon),
            profile: "driving",
            distance_m: Math.round(distance),
            duration_s: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
            provider: "osrm",
            updated_at: new Date().toISOString()
          });
        }
      });

      if (cachePayload.length) {
        await admin.from("route_distance_cache").upsert(cachePayload, { onConflict: "cache_key" });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      provider: "osrm",
      attribution: "OpenStreetMap contributors / OSRM",
      results: result
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected route error"
    }), { status: 502, headers: corsHeaders });
  }
});