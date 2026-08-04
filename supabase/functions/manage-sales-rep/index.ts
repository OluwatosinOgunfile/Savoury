import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `SV-POS-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 10)}!`;
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Supabase function secrets are not configured." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: caller } = await userClient.auth.getUser();
    if (!caller.user) return json({ error: "You must be signed in." }, 401);
    const { data: callerRow } = await adminClient.from("users").select("role").eq("id", caller.user.id).maybeSingle();
    if (callerRow?.role !== "admin") return json({ error: "Only admins can manage sales representatives." }, 403);

    const body = await req.json();
    const action = String(body.action || "upsert");
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const permissions = Array.isArray(body.permissions) ? body.permissions : ["discounts", "reports"];
    const status = String(body.status || "active");

    if (!email) return json({ error: "Provide a sales representative email." }, 400);

    if (action === "reset_password") {
      const userId = await findAuthUserIdByEmail(adminClient, email);
      if (!userId) return json({ error: "No Supabase Auth user found for this sales representative." }, 404);
      const nextPassword = temporaryPassword();
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: nextPassword, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ temporaryPassword: nextPassword });
    }

    if (!fullName) return json({ error: "Provide full name and email." }, 400);

    let authUserId = await findAuthUserIdByEmail(adminClient, email);
    let nextPassword: string | undefined;
    if (!authUserId) {
      nextPassword = temporaryPassword();
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: nextPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, role: "sales_rep" },
      });
      if (error) return json({ error: error.message }, 400);
      authUserId = data.user?.id;
    }

    if (!authUserId) return json({ error: "Could not create sales representative auth user." }, 400);

    await adminClient.from("users").upsert({ id: authUserId, email, role: "sales_rep" }, { onConflict: "id" });
    await adminClient.from("profiles").upsert({ id: authUserId, full_name: fullName, phone: phone || null }, { onConflict: "id" });

    const { data: rep, error: repError } = await adminClient
      .from("sales_representatives")
      .upsert(
        {
          auth_user_id: authUserId,
          full_name: fullName,
          email,
          phone: phone || null,
          status,
          permissions,
          created_by: caller.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      )
      .select("id, full_name, email, phone, staff_id, status, permissions, created_at, last_login_at")
      .single();

    if (repError) return json({ error: repError.message }, 400);
    return json({
      salesRepresentative: {
        id: rep.id,
        fullName: rep.full_name,
        email: rep.email,
        phone: rep.phone,
        staffId: rep.staff_id,
        status: rep.status,
        permissions: rep.permissions || [],
        createdAt: rep.created_at,
        lastLoginAt: rep.last_login_at,
      },
      temporaryPassword: nextPassword,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not manage sales representative." }, 500);
  }
});
