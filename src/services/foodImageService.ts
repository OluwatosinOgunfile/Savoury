import { dataUrlToImageFile, uploadBlobImage } from "@/services/blobImageService";

export async function uploadFoodImage(file: File): Promise<string> {
  return uploadBlobImage(file, "food");
}

export { dataUrlToImageFile };
