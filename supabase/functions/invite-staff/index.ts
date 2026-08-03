import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StaffRole = "admin" | "manager" | "kitchen" | "delivery" | "staff";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createTemporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `Sav-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12)}!`;
}

async function sendStaffEmail(input: {
  fullName: string;
  email: string;
  role: StaffRole;
  temporaryPassword: string;
  dashboardUrl: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("STAFF_INVITE_FROM_EMAIL") || "Savoury <onboarding@resend.dev>";
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured, so the staff login email could not be sent.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: input.email,
      subject: "Your Savoury staff dashboard login",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f2937">
          <h2 style="color:#556B2F">Welcome to Savoury</h2>
          <p>Hello ${input.fullName},</p>
          <p>Your staff dashboard access has been created.</p>
          <div style="background:#f3f7e8;border-radius:12px;padding:16px;margin:18px 0">
            <p><strong>Dashboard:</strong> <a href="${input.dashboardUrl}">${input.dashboardUrl}</a></p>
            <p><strong>Email:</strong> ${input.email}</p>
            <p><strong>Temporary password:</strong> ${input.temporaryPassword}</p>
            <p><strong>Role:</strong> ${input.role}</p>
          </div>
          <p>Please sign in and change your password immediately.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Resend email failed", text);
    throw new Error(`Staff login email could not be sent: ${text}`);
  }

  return true;
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
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase function secrets are not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: caller } = await userClient.auth.getUser();
    if (!caller.user) return json({ error: "You must be signed in." }, 401);

    const { data: callerRow } = await adminClient.from("users").select("role").eq("id", caller.user.id).maybeSingle();
    if (callerRow?.role !== "admin") return json({ error: "Only admins can add staff." }, 403);

    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "staff") as StaffRole;
    const dashboardUrl = String(body.dashboardUrl || "").trim() || `${supabaseUrl}/admin`;
    const allowedRoles: StaffRole[] = ["admin", "manager", "kitchen", "delivery", "staff"];

    if (!fullName || !email || !allowedRoles.includes(role)) {
      return json({ error: "Provide full name, email, and a valid role." }, 400);
    }

    const temporaryPassword = createTemporaryPassword();
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        staff_role: role,
      },
    });

    let userId = authUser.user?.id;
    if (authError) {
      const duplicateUser = authError.message.toLowerCase().includes("already") && authError.message.toLowerCase().includes("registered");
      if (!duplicateUser) {
        return json({ error: authError.message }, 400);
      }

      userId = await findAuthUserIdByEmail(adminClient, email);
      if (!userId) {
        return json({ error: "This email already exists in Supabase Auth, but the user could not be found for staff setup." }, 400);
      }

      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone,
          staff_role: role,
        },
      });

      if (updateAuthError) {
        return json({ error: updateAuthError.message }, 400);
      }
    }

    if (userId) {
      await adminClient.from("users").upsert({ id: userId, email, role: "admin" }, { onConflict: "id" });
      await adminClient.from("profiles").upsert(
        { id: userId, full_name: fullName, phone: phone || null },
        { onConflict: "id" },
      );
    }

    const { data: staff, error: staffError } = await adminClient
      .from("staff_members")
      .upsert(
        {
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          status: "invited",
          created_by: caller.user.id,
        },
        { onConflict: "email" },
      )
      .select("id, full_name, email, phone, role, status, created_at")
      .single();

    if (staffError) return json({ error: staffError.message }, 400);

    const emailSent = await sendStaffEmail({ fullName, email, role, temporaryPassword, dashboardUrl });

    return json({
      staff: {
        id: staff.id,
        fullName: staff.full_name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        createdAt: staff.created_at,
      },
      temporaryPassword,
      emailSent,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not invite staff." }, 500);
  }
});
