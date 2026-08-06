import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const foodImageBucket = "food-images";
const maxSourceBytes = 12 * 1024 * 1024;
const maxDimension = 1600;

export async function uploadFoodImage(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Food photos cannot be uploaded.");
  }
  if (!file.type.startsWith("image/")) throw new Error("Select a valid image file.");
  if (file.size > maxSourceBytes) throw new Error("Food photos must be smaller than 12 MB.");

  const optimized = await optimizeImage(file);
  const objectPath = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(foodImageBucket).upload(objectPath, optimized, {
    cacheControl: "31536000",
    contentType: "image/webp",
    upsert: false,
  });
  if (error) {
    if (/bucket.*not found/i.test(error.message)) {
      throw new Error("The food-images Storage bucket is missing. Run the food image storage SQL patch in Supabase.");
    }
    throw error;
  }

  const { data } = supabase.storage.from(foodImageBucket).getPublicUrl(objectPath);
  return data.publicUrl;
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("This browser could not compress the selected image.")),
      "image/webp",
      0.82,
    );
  });
}
