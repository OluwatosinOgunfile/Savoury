import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const salesEmail = process.env.SAVOURY_POS_EMAIL || env.SAVOURY_POS_EMAIL;
const salesPassword = process.env.SAVOURY_POS_PASSWORD || env.SAVOURY_POS_PASSWORD;
const salesName = process.env.SAVOURY_POS_NAME || env.SAVOURY_POS_NAME || "Savoury Sales Representative";
const salesPhone = process.env.SAVOURY_POS_PHONE || env.SAVOURY_POS_PHONE || "";
const salesBranch = process.env.SAVOURY_POS_BRANCH || env.SAVOURY_POS_BRANCH || "Ile-Ife Main Branch";
const salesShift = process.env.SAVOURY_POS_SHIFT || env.SAVOURY_POS_SHIFT || "Morning Shift";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

if (!salesEmail || !salesPassword) {
  console.error("Missing SAVOURY_POS_EMAIL or SAVOURY_POS_PASSWORD.");
  console.error("Set them in .env.local before running npm.cmd run pos:create.");
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
  email: salesEmail,
  password: salesPassword,
  email_confirm: true,
  user_metadata: {
    full_name: salesName,
    phone: salesPhone,
    role: "sales_rep",
  },
});

if (created.data?.user?.id) {
  userId = created.data.user.id;
} else if (created.error?.message?.toLowerCase().includes("already")) {
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const existing = users.data.users.find((user) => user.email?.toLowerCase() === salesEmail.toLowerCase());
  if (!existing) throw new Error(`POS auth user exists but could not be found: ${salesEmail}`);
  userId = existing.id;
  await must(
    "update existing POS auth user",
    supabase.auth.admin.updateUserById(userId, {
      password: salesPassword,
      email_confirm: true,
      user_metadata: {
        full_name: salesName,
        phone: salesPhone,
        role: "sales_rep",
      },
    })
  );
} else if (created.error) {
  throw created.error;
}

await must(
  "upsert public POS user",
  supabase.from("users").upsert(
    {
      id: userId,
      email: salesEmail,
      role: "sales_rep",
    },
    { onConflict: "id" }
  )
);

await must(
  "upsert POS profile",
  supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: salesName,
      phone: salesPhone || null,
      loyalty_points: 0,
      referral_code: "SAVOURYPOS",
    },
    { onConflict: "id" }
  )
);

await must(
  "upsert sales representative profile",
  supabase.from("sales_representatives").upsert(
    {
      auth_user_id: userId,
      full_name: salesName,
      email: salesEmail,
      phone: salesPhone || null,
      branch: salesBranch,
      shift: salesShift,
      status: "active",
      permissions: ["discounts", "reports"],
    },
    { onConflict: "email" }
  )
);

console.log("POS Sales Representative account ready.");
console.log(`Email: ${salesEmail}`);
console.log("Dashboard: /pos");
