import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function temporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `SV-KIT-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 10)}!`;
}

async function findUserByEmail(client: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are not configured." }, 500);

    const authorization = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(url, serviceKey);
    const { data: caller } = await userClient.auth.getUser();
    if (!caller.user) return json({ error: "You must be signed in." }, 401);

    const body = await req.json();
    const action = String(body.action || "upsert");
    const { data: callerRow } = await adminClient.from("users").select("role").eq("id", caller.user.id).maybeSingle();

    if (action === "complete_password_change" || action === "record_login") {
      if (callerRow?.role !== "kitchen") return json({ error: "Kitchen staff access is required." }, 403);
      const now = new Date().toISOString();
      const updates = action === "complete_password_change"
        ? { must_change_password: false, updated_at: now }
        : { last_login_at: now, updated_at: now };
      const { error } = await adminClient.from("kitchen_staff").update(updates).eq("auth_user_id", caller.user.id).eq("status", "active");
      if (error) return json({ error: error.message }, 400);
      if (action === "record_login") {
        const { error: logError } = await adminClient.from("kitchen_activity_logs").insert({ actor_id: caller.user.id, action: "signed_in" });
        if (logError) console.warn("Could not record kitchen login activity", logError.message);
      }
      return json({ success: true });
    }

    if (callerRow?.role !== "admin") return json({ error: "Only admins can manage kitchen staff." }, 403);
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const status = String(body.status || "active");
    if (!email) return json({ error: "Provide a kitchen staff email." }, 400);

    const existingAuthUser = await findUserByEmail(adminClient, email);
    if (action === "reset_password") {
      if (!existingAuthUser) return json({ error: "No Auth user found for this kitchen staff member." }, 404);
      const password = temporaryPassword();
      const { error } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, { password, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      const { error: flagError } = await adminClient.from("kitchen_staff").update({ must_change_password: true, updated_at: new Date().toISOString() }).eq("auth_user_id", existingAuthUser.id);
      if (flagError) return json({ error: flagError.message }, 400);
      return json({ temporaryPassword: password });
    }

    if (!fullName) return json({ error: "Provide the kitchen staff member's full name." }, 400);
    let authUserId = existingAuthUser?.id;
    let password: string | undefined;
    let created = false;
    if (!authUserId) {
      password = temporaryPassword();
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, phone, role: "kitchen" },
      });
      if (error) return json({ error: error.message }, 400);
      authUserId = data.user?.id;
      created = Boolean(authUserId);
    }
    if (!authUserId) return json({ error: "Could not create the kitchen Auth account." }, 400);

    const { error: userError } = await adminClient.from("users").upsert({ id: authUserId, email, role: "kitchen" }, { onConflict: "id" });
    if (userError) { if (created) await adminClient.auth.admin.deleteUser(authUserId); return json({ error: userError.message }, 400); }
    const { error: profileError } = await adminClient.from("profiles").upsert({ id: authUserId, full_name: fullName, phone: phone || null }, { onConflict: "id" });
    if (profileError) { if (created) await adminClient.auth.admin.deleteUser(authUserId); return json({ error: profileError.message }, 400); }

    const { data: staff, error: staffError } = await adminClient.from("kitchen_staff").upsert({
      auth_user_id: authUserId, full_name: fullName, email, phone: phone || null, status,
      ...(created ? { must_change_password: true } : {}), created_by: caller.user.id, updated_at: new Date().toISOString(),
    }, { onConflict: "email" }).select("id, full_name, email, phone, staff_id, status, must_change_password, created_at, last_login_at").single();
    if (staffError) { if (created) await adminClient.auth.admin.deleteUser(authUserId); return json({ error: staffError.message }, 400); }

    return json({ staff: {
      id: staff.id, fullName: staff.full_name, email: staff.email, phone: staff.phone, staffId: staff.staff_id,
      status: staff.status, mustChangePassword: staff.must_change_password, createdAt: staff.created_at, lastLoginAt: staff.last_login_at,
    }, temporaryPassword: password });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not manage kitchen staff." }, 500);
  }
});
