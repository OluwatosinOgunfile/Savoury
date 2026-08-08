import { handleUpload } from "@vercel/blob/client";
import { createClient } from "@supabase/supabase-js";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maximumImageSize = 12 * 1024 * 1024;

export default {
  async fetch(request) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Blob storage is not configured." }, { status: 500 });

    try {
      const body = await request.json();
      const response = await handleUpload({
        request,
        body,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const payload = parsePayload(clientPayload);
          const user = await verifyUser(payload.accessToken);
          const expectedPrefix = payload.kind === "food"
            ? "uploads/foods/"
            : `uploads/avatars/${user.id}/`;

          if (!pathname.startsWith(expectedPrefix)) throw new Error("Invalid image destination.");
          if (payload.kind === "food" && user.role !== "admin") throw new Error("Admin access is required to upload food images.");

          return {
            allowedContentTypes: allowedImageTypes,
            maximumSizeInBytes: maximumImageSize,
            addRandomSuffix: true,
            cacheControlMaxAge: 31536000,
            tokenPayload: JSON.stringify({ userId: user.id, kind: payload.kind }),
          };
        },
        onUploadCompleted: async () => undefined,
      });
      return Response.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload authorization failed.";
      return Response.json({ error: message }, { status: /access|required|session|token/i.test(message) ? 401 : 400 });
    }
  },
};

function parsePayload(value) {
  try {
    const payload = JSON.parse(value || "{}");
    if (!payload.accessToken || !["food", "avatar"].includes(payload.kind)) throw new Error();
    return payload;
  } catch {
    throw new Error("Invalid upload request.");
  }
}

async function verifyUser(accessToken) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Authentication service is not configured.");

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData.user) throw new Error("Your session has expired. Sign in again.");
  const { data: appUser, error: userError } = await client.from("users").select("role").eq("id", authData.user.id).single();
  if (userError || !appUser) throw new Error("Your application account could not be verified.");
  return { id: authData.user.id, role: appUser.role };
}
