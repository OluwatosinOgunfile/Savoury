import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  const content = fs.readFileSync(path, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const env = readEnvFile(".env.local");
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SECRET_KEY;

const adminEmail = process.env.SAVOURY_ADMIN_EMAIL || "admin@savoury.ng";
const adminPassword = process.env.SAVOURY_ADMIN_PASSWORD || "SavouryAdmin@2026!";
const adminName = process.env.SAVOURY_ADMIN_NAME || "Savoury Admin";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL and a service-role key in .env.local.");
  console.error("Add SUPABASE_SERVICE_ROLE_KEY, or use your existing VITE_SUPABASE_SECRET_KEY for this local script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let userId;
const created = await supabase.auth.admin.createUser({
  email: adminEmail,
  password: adminPassword,
  email_confirm: true,
  user_metadata: {
    full_name: adminName,
  },
});

if (created.data?.user?.id) {
  userId = created.data.user.id;
} else if (created.error?.message?.toLowerCase().includes("already")) {
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const existing = users.data.users.find((user) => user.email === adminEmail);
  if (!existing) throw new Error(`Admin auth user exists but could not be found: ${adminEmail}`);
  userId = existing.id;
  await must(
    "update existing auth admin",
    supabase.auth.admin.updateUserById(userId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
      },
    })
  );
} else if (created.error) {
  throw created.error;
}

await must(
  "upsert public admin user",
  supabase.from("users").upsert(
    {
      id: userId,
      email: adminEmail,
      role: "admin",
    },
    { onConflict: "id" }
  )
);

await must(
  "upsert admin profile",
  supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: adminName,
      loyalty_points: 0,
      referral_code: "SAVOURYADMIN",
    },
    { onConflict: "id" }
  )
);

console.log("Admin account ready.");
console.log(`Email: ${adminEmail}`);
console.log(`Password: ${adminPassword}`);
