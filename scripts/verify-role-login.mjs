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
const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SAVOURY_POS_EMAIL", "SAVOURY_POS_PASSWORD"];
const missing = required.filter((name) => !env[name]);

if (missing.length) {
  console.error(`Missing required variables: ${missing.join(", ")}`);
  process.exit(1);
}

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: login, error: loginError } = await client.auth.signInWithPassword({
  email: env.SAVOURY_POS_EMAIL,
  password: env.SAVOURY_POS_PASSWORD,
});

if (loginError) {
  console.error(`Login failed: ${loginError.message}`);
  process.exit(2);
}

const { data: appUser, error: roleError } = await client
  .from("users")
  .select("role")
  .eq("id", login.user.id)
  .maybeSingle();

const { data: salesRep, error: repError } = await client
  .from("sales_representatives")
  .select("status, permissions")
  .eq("auth_user_id", login.user.id)
  .maybeSingle();

console.log("Login successful.");
console.log(`Role: ${roleError ? `query failed (${roleError.message})` : appUser?.role || "missing"}`);
console.log(`POS profile: ${repError ? `query failed (${repError.message})` : salesRep ? "found" : "missing"}`);
console.log(`Status: ${salesRep?.status || "unavailable"}`);
console.log(`Permissions: ${salesRep?.permissions?.join(", ") || "none"}`);

await client.auth.signOut();
