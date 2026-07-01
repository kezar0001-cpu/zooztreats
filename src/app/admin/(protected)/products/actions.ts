"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS_TAG } from "@/lib/products";
import {
  productSchema,
  dollarsToCents,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/lib/validation";
import {
  uploadProductImage,
  deleteStorageObjects,
} from "@/lib/storage";
import type { ActionResult } from "@/lib/types";

// --- Helpers --------------------------------------------------------------

function checkbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

function parseProductForm(formData: FormData) {
  const priceCents = dollarsToCents(String(formData.get("price") ?? ""));
  const boxTypeRaw = String(formData.get("box_type") ?? "");

  return productSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    price_cents: priceCents ?? NaN,
    category: String(formData.get("category") ?? ""),
    prep_time_note: String(formData.get("prep_time_note") ?? ""),
    allergens: String(formData.get("allergens") ?? ""),
    box_type: boxTypeRaw === "" ? null : boxTypeRaw,
    active: checkbox(formData.get("active")),
    featured: checkbox(formData.get("featured")),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });
}

// --- Create ---------------------------------------------------------------

export async function createProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const v = parsed.data;
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: v.name,
      slug: v.slug,
      description: v.description || null,
      price_cents: v.price_cents,
      category: v.category || null,
      prep_time_note: v.prep_time_note || null,
      allergens: v.allergens || null,
      box_type: v.box_type,
      active: v.active,
      featured: v.featured,
      sort_order: v.sort_order,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with that slug already exists.",
        fieldErrors: { slug: ["Slug must be unique."] },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/admin");
  redirect(`/admin/products/${data.id}/edit?created=1`);
}

// --- Update ---------------------------------------------------------------

export async function updateProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing product id." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("products")
    .update({
      name: v.name,
      slug: v.slug,
      description: v.description || null,
      price_cents: v.price_cents,
      category: v.category || null,
      prep_time_note: v.prep_time_note || null,
      allergens: v.allergens || null,
      box_type: v.box_type,
      active: v.active,
      featured: v.featured,
      sort_order: v.sort_order,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with that slug already exists.",
        fieldErrors: { slug: ["Slug must be unique."] },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
  revalidatePath(`/admin/products/${id}/edit`);
  revalidatePath("/admin");
  return { ok: true, data: undefined, message: "Product saved." };
}

// --- Delete ---------------------------------------------------------------

export async function deleteProduct(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // Clean up storage objects (DB rows cascade on product delete; order_items
  // keep their snapshotted product_name via ON DELETE SET NULL).
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    // Surface a friendly, actionable error instead of a server crash. With the
    // ON DELETE SET NULL migration applied this should not happen, but if the
    // migration is missing we guide the operator to deactivate instead.
    console.error("[deleteProduct] failed:", error.message);
    redirect(
      `/admin/products?error=${encodeURIComponent(
        "Couldn't delete this product. It may appear in past orders — deactivate it instead to hide it from the store.",
      )}`,
    );
  }

  if (images && images.length > 0) {
    await deleteStorageObjects(images.map((i) => i.storage_path));
  }

  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/admin");
}

// --- Toggle active --------------------------------------------------------

export async function toggleProductActive(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const next = checkbox(formData.get("active"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("products").update({ active: next }).eq("id", id);

  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/admin");
}

// --- Images: upload -------------------------------------------------------

export async function uploadProductImages(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return { ok: false, error: "Missing product id." };

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { ok: false, error: "Please choose at least one image." };
  }

  // Server-side validation of every file (do not trust the client).
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" is larger than ${MAX_IMAGE_MB} MB.`,
      };
    }
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      )
    ) {
      return {
        ok: false,
        error: `"${file.name}" is not a supported image type (${ALLOWED_IMAGE_EXTENSIONS}).`,
      };
    }
  }

  const supabase = await createClient();

  // Determine current image count to set sort_order and primary.
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  let existing = count ?? 0;
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const { storagePath, publicUrl } = await uploadProductImage(
        productId,
        file,
      );
      uploadedPaths.push(storagePath);

      const { error } = await supabase.from("product_images").insert({
        product_id: productId,
        image_url: publicUrl,
        storage_path: storagePath,
        alt_text: null,
        is_primary: existing === 0, // first-ever image becomes primary
        sort_order: existing,
      });
      if (error) throw new Error(error.message);
      existing += 1;
    }
  } catch (e) {
    // Best-effort rollback of uploaded storage objects. Log a safe message
    // (never secrets) so the failure is diagnosable without crashing the page.
    console.error("[uploadProductImages] failed:", (e as Error)?.message);
    await deleteStorageObjects(uploadedPaths);
    return {
      ok: false,
      error:
        "We couldn't upload your image. Please try again with a smaller JPEG, PNG or WEBP.",
    };
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
  return {
    ok: true,
    data: undefined,
    message: `Uploaded ${files.length} image${files.length === 1 ? "" : "s"}.`,
  };
}

// --- Images: delete -------------------------------------------------------

export async function deleteProductImage(formData: FormData): Promise<void> {
  await assertAdmin();
  const imageId = String(formData.get("image_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!imageId || !productId) return;

  const supabase = await createClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle();

  await supabase.from("product_images").delete().eq("id", imageId);

  if (image) {
    await deleteStorageObjects([image.storage_path]);

    // If we deleted the primary image, promote the next one.
    if (image.is_primary) {
      const { data: next } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next) {
        await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", next.id);
      }
    }
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
}

// --- Images: set primary --------------------------------------------------

export async function setPrimaryImage(formData: FormData): Promise<void> {
  await assertAdmin();
  const imageId = String(formData.get("image_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!imageId || !productId) return;

  const supabase = await createClient();
  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidateTag(PRODUCTS_TAG);
}

// --- Images: reorder ------------------------------------------------------

export async function moveProductImage(formData: FormData): Promise<void> {
  await assertAdmin();
  const imageId = String(formData.get("image_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!imageId || !productId || !["up", "down"].includes(direction)) return;

  const supabase = await createClient();
  const { data: images } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!images) return;

  const index = images.findIndex((i) => i.id === imageId);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= images.length) return;

  const a = images[index];
  const b = images[swapWith];

  // Swap their sort_order values.
  await Promise.all([
    supabase
      .from("product_images")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id),
    supabase
      .from("product_images")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id),
  ]);

  revalidatePath(`/admin/products/${productId}/edit`);
}
