import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = "v26.0";
const MAX_BODY_BYTES = 1_000_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstField(fields: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (fields[key]) return fields[key];
  }
  return "";
}

function parseGuestCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  // customer_enquiries.guests is an integer column; reject overflow before the RPC cast.
  return Number.isSafeInteger(parsed) && parsed <= 2147483647 ? parsed : null;
}

async function verifyMetaSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice(7).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHex)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const actualHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (actualHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const verifyToken = Deno.env.get("META_VERIFY_TOKEN") ?? "";
  const pageAccessToken = Deno.env.get("META_PAGE_ACCESS_TOKEN") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!verifyToken || !pageAccessToken || !appSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Meta webhook is missing required environment secrets");
    return json({ error: "Webhook is not configured" }, 500);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const validSignature = await verifyMetaSignature(
    rawBody,
    req.headers.get("x-hub-signature-256"),
    appSecret,
  );
  if (!validSignature) {
    console.warn("Rejected webhook with invalid Meta signature");
    return json({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (payload?.object !== "page") {
    return json({ received: true, ignored: true });
  }
  if (!Array.isArray(payload.entry)) {
    return json({ error: "Invalid page webhook payload" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    for (const entry of payload.entry) {
      if (!Array.isArray(entry?.changes)) {
        return json({ error: "Invalid page webhook entry" }, 400);
      }

      for (const change of entry.changes) {
        if (change?.field !== "leadgen") continue;

        const value = change?.value ?? {};
        const leadgenId = String(value.leadgen_id ?? "").trim();
        if (!leadgenId) {
          console.warn("Ignored Meta leadgen change without a lead ID");
          continue;
        }

        const leadUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}`);
        leadUrl.searchParams.set(
          "fields",
          "id,created_time,field_data,form_id,ad_id,adset_id,campaign_id",
        );
        leadUrl.searchParams.set("access_token", pageAccessToken);

        const leadResponse = await fetch(leadUrl.toString());
        if (!leadResponse.ok) {
          // Do not log the response body: it is external input and may contain sensitive data.
          console.error("Meta lead retrieval failed", { leadId: leadgenId, status: leadResponse.status });
          throw new Error("Meta lead retrieval failed");
        }

        let leadJson: any;
        try {
          leadJson = await leadResponse.json();
        } catch {
          console.error("Meta lead retrieval returned invalid JSON", { leadId: leadgenId });
          throw new Error("Meta lead response was invalid");
        }

        const fields: Record<string, string> = {};
        for (const item of leadJson.field_data ?? []) {
          const key = normalizeKey(String(item?.name ?? ""));
          const vals = Array.isArray(item?.values) ? item.values : [];
          if (key && vals.length) fields[key] = vals.map(String).join(", ");
        }

        const fullName = firstField(fields, ["full_name", "name", "your_name"]);
        const firstName = firstField(fields, ["first_name"]);
        const lastName = firstField(fields, ["last_name"]);
        const customerName = fullName || [firstName, lastName].filter(Boolean).join(" ");
        const mobile = firstField(fields, ["phone_number", "phone", "mobile", "contact_number"]);
        const email = firstField(fields, ["email", "email_address"]);
        const location = firstField(fields, [
          "city_location",
          "city",
          "location",
          "where_are_you_looking_for_a_venue",
          "where_are_you_looking_for_a_venue_",
        ]);
        const occasion = firstField(fields, [
          "type_of_event",
          "event_type",
          "occasion",
          "what_type_of_event_are_you_planning",
        ]);
        const timing = firstField(fields, [
          "event_timing",
          "when_are_you_planning_your_event",
          "what_is_the_event_date",
          "event_date",
        ]);
        const guestAnswer = firstField(fields, [
          "guest_count",
          "estimated_guest_count",
          "what_is_your_estimated_guest_count",
          "number_of_guests",
        ]);
        const guests = parseGuestCount(guestAnswer);

        // A lead without a usable name or phone cannot be actioned by the calling team.
        // Acknowledge-and-skip it rather than retrying a permanently incomplete Meta record.
        if (!customerName.trim() || !mobile.trim()) {
          console.warn("Skipped Meta lead with missing required contact fields", { leadId: leadgenId });
          continue;
        }

        const requirementParts = [
          timing ? `Event timing: ${timing}` : "",
          guestAnswer && guests === null ? `Guest count: ${guestAnswer}` : "",
          `Meta form ID: ${leadJson.form_id ?? value.form_id ?? ""}`,
          `Meta campaign ID: ${leadJson.campaign_id ?? value.campaign_id ?? ""}`,
          `Meta ad set ID: ${leadJson.adset_id ?? value.adset_id ?? ""}`,
          `Meta ad ID: ${leadJson.ad_id ?? value.ad_id ?? ""}`,
        ].filter(Boolean);

        const row: Record<string, unknown> = {
          customer_name: customerName.trim(),
          mobile: mobile.trim(),
          email: email || null,
          location: location || null,
          occasion: occasion || null,
          requirements: requirementParts.join("\n") || null,
          source: "Meta Ads - Instant Form",
          status: "new",
        };
        if (guests !== null) row.guests = guests;

        // The database RPC claims the Meta lead ID and inserts the CRM row in one
        // transaction. A unique key on the event table makes concurrent retries safe.
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "insert_meta_lead_enquiry",
          { p_meta_lead_id: leadgenId, p_enquiry: row },
        );

        if (rpcError) {
          console.error("Atomic Meta lead insert failed", {
            leadId: leadgenId,
            code: rpcError.code ?? "unknown",
          });
          throw new Error("Atomic Meta lead insert failed");
        }

        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (!result?.inserted) {
          console.log("Duplicate Meta lead ignored", leadgenId);
          continue;
        }

        console.log("Meta lead inserted", leadgenId);
      }
    }

    return json({ received: true });
  } catch (error) {
    // Never log the full error object, request payload, or mapped customer row.
    console.error("Meta webhook processing failed", error instanceof Error ? error.name : "unknown error");
    return json({ error: "Processing failed" }, 500);
  }
});
