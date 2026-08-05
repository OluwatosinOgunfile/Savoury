import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")]; })
);
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase URL and service-role key are required.");

const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: staff, error: staffError } = await client.from("kitchen_staff").select("email, auth_user_id, status, must_change_password").order("created_at");
if (staffError) throw staffError;
const { data: authData, error: authError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw authError;
const { data: appUsers, error: usersError } = await client.from("users").select("id, email, role");
if (usersError) throw usersError;

for (const member of staff) {
  const authUser = authData.users.find((user) => user.email?.toLowerCase() === member.email.toLowerCase());
  const appUser = appUsers.find((user) => user.id === authUser?.id);
  console.log(JSON.stringify({
    email: member.email,
    authUser: Boolean(authUser),
    linked: Boolean(authUser && member.auth_user_id === authUser.id),
    role: appUser?.role || "missing",
    status: member.status,
    mustChangePassword: member.must_change_password,
    emailConfirmed: Boolean(authUser?.email_confirmed_at),
  }));
}
