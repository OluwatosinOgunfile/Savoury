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

const env = readEnvFile(".env.local");
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const checks = [
  ["categories", "id"],
  ["foods", "id"],
  ["coupons", "id"],
  ["reviews", "id"],
];

let failed = false;

for (const [table, column] of checks) {
  const { count, error } = await supabase.from(table).select(column, {
    count: "exact",
    head: true,
  });

  if (error) {
    failed = true;
    console.log(`${table}: FAIL - ${error.message}`);
  } else {
    console.log(`${table}: OK - count ${count ?? 0}`);
  }
}

const { error: authError } = await supabase.auth.getSession();
if (authError) {
  failed = true;
  console.log(`auth session endpoint: FAIL - ${authError.message}`);
} else {
  console.log("auth session endpoint: OK");
}

process.exit(failed ? 1 : 0);
