import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

const env = readEnv(".env.local");
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
  process.exit(1);
}

const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: reps, error: repsError } = await client
  .from("sales_representatives")
  .select("email, auth_user_id, status, must_change_password")
  .order("created_at");
if (repsError) throw repsError;

const { data: authData, error: authError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw authError;

const { data: appUsers, error: appUsersError } = await client.from("users").select("id, email, role");
if (appUsersError) throw appUsersError;

for (const rep of reps) {
  const authUser = authData.users.find((user) => user.email?.toLowerCase() === rep.email.toLowerCase());
  const appUser = appUsers.find((user) => user.id === authUser?.id);
  console.log(
    JSON.stringify({
      email: rep.email,
      status: rep.status,
      authUser: Boolean(authUser),
      linkedToAuthUser: Boolean(authUser && rep.auth_user_id === authUser.id),
      role: appUser?.role || "missing",
      emailConfirmed: Boolean(authUser?.email_confirmed_at),
      mustChangePassword: rep.must_change_password === true,
    })
  );
}
