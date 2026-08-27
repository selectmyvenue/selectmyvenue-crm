import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://crm.selectmyvenue.com"
]);

const PARTNER_REDIRECT_URL =
  "https://partner.selectmyvenue.com/reset-password.html";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      ALLOWED_ORIGINS.has(origin) ? origin : "https://crm.selectmyvenue.com",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function findAuthUserByEmail(adminClient, email) {
  const wanted = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const match = users.find(
      user => String(user.email || "").toLowerCase() === wanted
    );

    if (match) {
      return match;
    }

    if (users.length < 1000) {
      break;
    }
  }

  return null;
}

async function findPartnerProfile(adminClient, venueId, userId, email) {
  const byUser = await adminClient
    .from("venue_partner_profiles")
    .select("id,venue_id,user_id,email,is_primary,is_active")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (byUser.error) {
    throw byUser.error;
  }

  if (byUser.data) {
    return byUser.data;
  }

  const byVenueEmail = await adminClient
    .from("venue_partner_profiles")
    .select("id,venue_id,user_id,email,is_primary,is_active")
    .eq("venue_id", venueId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (byVenueEmail.error) {
    throw byVenueEmail.error;
  }

  return byVenueEmail.data || null;
}

Deno.serve(async request => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json(origin, 403, { error: "Origin not allowed." });
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  }

  if (request.method !== "POST") {
    return json(origin, 405, { error: "Method not allowed." });
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(origin, 403, { error: "Origin not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = request.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(origin, 500, { error: "Partner invite service is not configured." });
  }

  if (!authorization.startsWith("Bearer ")) {
    return json(origin, 401, { error: "Authentication required." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } =
      await userClient.auth.getUser(token);

    if (authError || !authData?.user) {
      return json(origin, 401, { error: "Your CRM session is invalid or expired." });
    }

    const { data: staffProfile, error: staffError } = await adminClient
      .from("staff_profiles")
      .select("user_id,is_active,role")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (!staffProfile) {
      return json(origin, 403, { error: "Active Master CRM staff access is required." });
    }

    const body = await request.json().catch(() => ({}));
    const venueId = cleanText(body.venue_id, 36);
    const fullName = cleanText(body.full_name, 120);
    const email = cleanText(body.email, 254).toLowerCase();
    const mobile = cleanText(body.mobile, 30) || null;
    const whatsappNumber = cleanText(body.whatsapp_number, 30) || mobile;

    if (!validUuid(venueId)) {
      return json(origin, 400, { error: "A valid venue is required." });
    }

    if (fullName.length < 2) {
      return json(origin, 400, { error: "Partner name is required." });
    }

    if (!validEmail(email)) {
      return json(origin, 400, { error: "A valid partner email is required." });
    }

    const { data: venue, error: venueError } = await adminClient
      .from("venues")
      .select("id,venue_name")
      .eq("id", venueId)
      .maybeSingle();

    if (venueError) {
      throw venueError;
    }

    if (!venue) {
      return json(origin, 404, { error: "Venue not found." });
    }

    let authUser = await findAuthUserByEmail(adminClient, email);
    let createdAuthUser = false;
    let emailMode = "invite";

    if (authUser) {
      const { data: staffWithEmail, error: staffWithEmailError } =
        await adminClient
          .from("staff_profiles")
          .select("user_id")
          .eq("user_id", authUser.id)
          .maybeSingle();

      if (staffWithEmailError) {
        throw staffWithEmailError;
      }

      if (staffWithEmail) {
        return json(origin, 409, {
          error: "This email belongs to a Master CRM staff account and cannot be linked as a venue partner."
        });
      }
    } else {
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: PARTNER_REDIRECT_URL,
          data: {
            full_name: fullName,
            venue_id: venueId,
            venue_name: venue.venue_name,
            smv_role: "venue_partner"
          }
        });

      if (inviteError || !inviteData?.user) {
        return json(origin, 400, {
          error: inviteError?.message || "Unable to create the Partner CRM invitation."
        });
      }

      authUser = inviteData.user;
      createdAuthUser = true;
    }

    const existingProfile = await findPartnerProfile(
      adminClient,
      venueId,
      authUser.id,
      email
    );

    if (
      existingProfile &&
      String(existingProfile.venue_id) !== venueId
    ) {
      return json(origin, 409, {
        error: "This Partner CRM account is already linked to another venue."
      });
    }

    if (
      existingProfile?.user_id &&
      String(existingProfile.user_id) !== String(authUser.id)
    ) {
      return json(origin, 409, {
        error: "This venue email is already linked to a different Partner CRM account."
      });
    }

    const profilePayload = {
      venue_id: venueId,
      user_id: authUser.id,
      full_name: fullName,
      designation: "Venue Partner",
      email,
      mobile,
      whatsapp_number: whatsappNumber,
      partner_role: "owner",
      is_primary: true,
      is_active: true
    };

    await adminClient
      .from("venue_partner_profiles")
      .update({ is_primary: false })
      .eq("venue_id", venueId)
      .eq("is_primary", true)
      .neq("user_id", authUser.id);

    const profileResult = existingProfile
      ? await adminClient
          .from("venue_partner_profiles")
          .update(profilePayload)
          .eq("id", existingProfile.id)
          .select("id,venue_id,user_id,full_name,email,is_primary,is_active")
          .single()
      : await adminClient
          .from("venue_partner_profiles")
          .insert(profilePayload)
          .select("id,venue_id,user_id,full_name,email,is_primary,is_active")
          .single();

    if (profileResult.error) {
      if (createdAuthUser) {
        await adminClient.auth.admin.deleteUser(authUser.id);
      }
      throw profileResult.error;
    }

    let emailSent = createdAuthUser;

    if (!createdAuthUser) {
      emailMode = "recovery";
      const emailClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: recoveryError } =
        await emailClient.auth.resetPasswordForEmail(email, {
          redirectTo: PARTNER_REDIRECT_URL
        });

      emailSent = !recoveryError;
    }

    return json(origin, 200, {
      ok: true,
      status: createdAuthUser ? "invited" : "linked",
      email_sent: emailSent,
      email_mode: emailMode,
      venue: {
        id: venue.id,
        name: venue.venue_name
      },
      partner: profileResult.data
    });
  } catch (error) {
    console.error("Partner invite error:", error?.message || error);
    return json(origin, 500, {
      error: "Unable to create Partner CRM access right now."
    });
  }
});
