import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const env = readEnvFile(path.join(root, ".env.local"));
const blobToken = env.BLOB_READ_WRITE_TOKEN;
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN is missing from .env.local.");
if (!supabaseUrl || !serviceKey) throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to migrate database images.");
if (!env.BLOB_STORE_ID) console.warn("BLOB_STORE_ID is not set. The token will still select the connected Blob store.");

const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const assetMap = {};
const failures = [];

console.log("Uploading repository image assets...");
const imageRoot = path.join(root, "public", "images");
for (const filePath of walkFiles(imageRoot)) {
  const relative = path.relative(path.join(root, "public"), filePath).replaceAll("\\", "/");
  const publicPath = `/${relative}`;
  try {
    const blob = await put(`savoury/assets/${relative}`, fs.readFileSync(filePath), {
      access: "public",
      token: blobToken,
      contentType: contentTypeFor(filePath),
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
    assetMap[publicPath] = blob.url;
    console.log(`  ${publicPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cannot use public access on a private store/i.test(message)) {
      throw new Error("The connected Vercel Blob store is private. Create a public Blob store for website images, replace BLOB_STORE_ID and BLOB_READ_WRITE_TOKEN, then run this command again. Vercel does not allow changing a store from private to public.");
    }
    throw new Error(`Could not upload ${publicPath}: ${message}`);
  }
}

await migrateTableImages("foods", "image_url", "food");
await migrateTableImages("profiles", "avatar_url", "avatar");
await migrateTableImages("reviews", "image_url", "review");

rewriteLocalAssetReferences(assetMap);
const manifestPath = path.join(root, "scripts", "blob-assets-manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), storeId: env.BLOB_STORE_ID || null, assets: assetMap }, null, 2)}\n`);

console.log(`\nUploaded ${Object.keys(assetMap).length} repository assets.`);
console.log(`Manifest: ${path.relative(root, manifestPath)}`);
if (failures.length) {
  console.warn(`${failures.length} database image(s) could not be migrated:`);
  failures.forEach((failure) => console.warn(`  ${failure}`));
  process.exitCode = 1;
} else {
  console.log("All database image references were migrated successfully.");
}

async function migrateTableImages(table, column, folder) {
  console.log(`Migrating ${table}.${column}...`);
  const { data, error } = await supabase.from(table).select(`id, ${column}`).not(column, "is", null);
  if (error) {
    failures.push(`${table}: ${error.message}`);
    return;
  }

  for (const row of data || []) {
    const currentUrl = row[column];
    if (!currentUrl || isVercelBlobUrl(currentUrl)) continue;
    try {
      const localUrl = currentUrl.startsWith("/") ? assetMap[currentUrl] : undefined;
      const blobUrl = localUrl || await copyUrlToBlob(currentUrl, `savoury/database/${folder}/${row.id}`);
      if (!blobUrl) throw new Error("Image source returned no usable image.");
      const { error: updateError } = await supabase.from(table).update({ [column]: blobUrl }).eq("id", row.id);
      if (updateError) throw updateError;
      console.log(`  ${table}/${row.id}`);
    } catch (error) {
      failures.push(`${table}/${row.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function copyUrlToBlob(source, pathnamePrefix) {
  const response = source.startsWith("data:")
    ? await fetch(source)
    : await fetch(source, { redirect: "follow", headers: { "user-agent": "Savoury image migration/1.0" } });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!contentType.startsWith("image/")) throw new Error(`Source content type is ${contentType || "unknown"}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 12 * 1024 * 1024) throw new Error("Image is larger than 12 MB.");
  const extension = extensionForContentType(contentType);
  const blob = await put(`${pathnamePrefix}.${extension}`, bytes, {
    access: "public",
    token: blobToken,
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
  });
  return blob.url;
}

function rewriteLocalAssetReferences(mapping) {
  const roots = ["src", "scripts", "supabase"];
  const extensions = new Set([".ts", ".tsx", ".mjs", ".js", ".sql", ".json", ".html", ".css"]);
  for (const relativeRoot of roots) {
    const directory = path.join(root, relativeRoot);
    if (!fs.existsSync(directory)) continue;
    for (const filePath of walkFiles(directory)) {
      if (!extensions.has(path.extname(filePath).toLowerCase()) || filePath.endsWith("blob-assets-manifest.json")) continue;
      const original = fs.readFileSync(filePath, "utf8");
      let next = original;
      for (const [localPath, blobUrl] of Object.entries(mapping)) next = next.replaceAll(localPath, blobUrl);
      if (next !== original) fs.writeFileSync(filePath, next);
    }
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function readEnvFile(filePath) {
  return Object.fromEntries(fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
  }));
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" })[extension] || "application/octet-stream";
}

function extensionForContentType(contentType) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" })[contentType] || "img";
}

function isVercelBlobUrl(value) {
  try { return new URL(value).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
}
