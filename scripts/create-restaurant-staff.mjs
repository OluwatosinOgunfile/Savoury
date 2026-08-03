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

const staffEmail = process.env.SAVOURY_RESTAURANT_EMAIL || "restaurant@savoury.ng";
const staffPassword = process.env.SAVOURY_RESTAURANT_PASSWORD || "Restaurant@2026!";
const staffName = process.env.SAVOURY_RESTAURANT_NAME || "Restaurant Cashier";
const staffPhone = process.env.SAVOURY_RESTAURANT_PHONE || "";
const staffRole = process.env.SAVOURY_RESTAURANT_ROLE || "staff";

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
  email: staffEmail,
  password: staffPassword,
  email_confirm: true,
  user_metadata: {
    full_name: staffName,
    phone: staffPhone,
    staff_role: staffRole,
  },
});

if (created.data?.user?.id) {
  userId = created.data.user.id;
} else if (created.error?.message?.toLowerCase().includes("already")) {
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const existing = users.data.users.find((user) => user.email === staffEmail);
  if (!existing) throw new Error(`Restaurant staff auth user exists but could not be found: ${staffEmail}`);
  userId = existing.id;
  await must(
    "update existing restaurant staff",
    supabase.auth.admin.updateUserById(userId, {
      password: staffPassword,
      email_confirm: true,
      user_metadata: {
        full_name: staffName,
        phone: staffPhone,
        staff_role: staffRole,
      },
    })
  );
} else if (created.error) {
  throw created.error;
}

await must(
  "upsert app user",
  supabase.from("users").upsert(
    {
      id: userId,
      email: staffEmail,
      role: "admin",
    },
    { onConflict: "id" }
  )
);

await must(
  "upsert staff profile",
  supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: staffName,
      phone: staffPhone || null,
      loyalty_points: 0,
      referral_code: "SAVOURYSTAFF",
    },
    { onConflict: "id" }
  )
);

await must(
  "upsert restaurant staff member",
  supabase.from("staff_members").upsert(
    {
      auth_user_id: userId,
      full_name: staffName,
      email: staffEmail,
      phone: staffPhone || null,
      role: staffRole,
      status: "active",
    },
    { onConflict: "email" }
  )
);

console.log("Restaurant dashboard account ready.");
console.log(`Email: ${staffEmail}`);
console.log(`Password: ${staffPassword}`);
console.log("Dashboard: /restaurant");
