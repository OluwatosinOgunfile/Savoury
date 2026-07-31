import fs from "node:fs";
import { spawnSync } from "node:child_process";

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

const env = { ...process.env, ...readEnvFile(".env.local") };
const databaseUrl = env.SUPABASE_DB_URL || env.DATABASE_URL || env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("Missing a Postgres connection string.");
  console.error("Add SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL to .env.local.");
  console.error("You can copy the connection string from Supabase Dashboard > Project Settings > Database.");
  process.exit(1);
}

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", "supabase/schema.sql"], {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
