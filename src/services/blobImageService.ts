import { upload } from "@vercel/blob/client";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type BlobImageKind = "food" | "avatar";

const maxSourceBytes = 12 * 1024 * 1024;
const maxDimension = 1600;

export async function uploadBlobImage(file: File, kind: BlobImageKind): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Authentication is not configured.");
  if (!file.type.startsWith("image/")) throw new Error("Select a valid image file.");
  if (file.size > maxSourceBytes) throw new Error("Images must be smaller than 12 MB.");

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const userId = data.session?.user.id;
  if (!accessToken || !userId) throw new Error("Your session has expired. Sign in again.");

  const optimized = await optimizeImage(file);
  const pathname = kind === "food"
    ? `uploads/foods/${crypto.randomUUID()}.webp`
    : `uploads/avatars/${userId}/${crypto.randomUUID()}.webp`;
  try {
    const blob = await upload(pathname, optimized, {
      access: "public",
      contentType: "image/webp",
      handleUploadUrl: "/api/blob-upload",
      clientPayload: JSON.stringify({ kind, accessToken }),
    });
    return blob.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blob upload failed.";
    if (/private store|cannot use public access/i.test(message)) throw new Error("The connected Vercel Blob store must be public for restaurant images.");
    throw error;
  }
}

export async function dataUrlToImageFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

async function optimizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser could not prepare the selected image.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("This browser could not compress the selected image.")),
    "image/webp",
    0.82,
  ));
}
