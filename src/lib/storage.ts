import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

function extensionFor(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (fromName) return fromName;
  const fromType = file.type.split("/").pop();
  return fromType || "bin";
}

export interface UploadedImage {
  storagePath: string;
  publicUrl: string;
}

// Uploads a single image file to the product-images bucket and returns the
// storage path and public URL.
export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<UploadedImage> {
  const supabase = await createClient();
  const bucket = env.storageBucket;

  const ext = extensionFor(file);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${productId}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

// Removes image files from storage. Errors are swallowed (best-effort cleanup).
export async function deleteStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from(env.storageBucket).remove(paths);
}
