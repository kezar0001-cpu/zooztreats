import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Product, ProductImage, ProductWithImages } from "@/lib/types";
import type { StoreProduct } from "@/types/store";

// Cache tag for the public storefront product list. Mutations call
// revalidateTag(PRODUCTS_TAG) to refresh it immediately.
export const PRODUCTS_TAG = "products";

// Order images so the primary one comes first, then by sort_order.
function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function getProducts(): Promise<ProductWithImages[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    ...(p as ProductWithImages),
    product_images: sortImages((p as ProductWithImages).product_images ?? []),
  }));
}

export async function getProductById(
  id: string,
): Promise<ProductWithImages | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...(data as ProductWithImages),
    product_images: sortImages((data as ProductWithImages).product_images ?? []),
  };
}

export interface ProductCounts {
  active: number;
  inactive: number;
}

export async function getProductCounts(): Promise<ProductCounts> {
  const supabase = await createClient();

  const [activeRes, inactiveRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", false),
  ]);

  if (activeRes.error) throw new Error(activeRes.error.message);
  if (inactiveRes.error) throw new Error(inactiveRes.error.message);

  return {
    active: activeRes.count ?? 0,
    inactive: inactiveRes.count ?? 0,
  };
}

export function getPrimaryImage(
  product: ProductWithImages,
): ProductImage | null {
  if (!product.product_images || product.product_images.length === 0) {
    return null;
  }
  return (
    product.product_images.find((img) => img.is_primary) ??
    product.product_images[0]
  );
}

// --- Public storefront -----------------------------------------------------

// Fetches active products for the public storefront, flattened to a primary
// image. RLS only exposes active products to anonymous visitors; we also filter
// explicitly. Sorted: featured first, then sort_order, then name.
//
// Wrapped in unstable_cache (tagged PRODUCTS_TAG) so repeat visits don't hit the
// database; admin product mutations call revalidateTag(PRODUCTS_TAG). Uses the
// cookieless public client because unstable_cache must not read cookies/headers.
export const getActiveProducts = unstable_cache(
  fetchActiveProducts,
  ["active-products"],
  { tags: [PRODUCTS_TAG], revalidate: 300 },
);

async function fetchActiveProducts(): Promise<StoreProduct[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("active", true);

  if (error) throw new Error(error.message);

  const rows = [...((data ?? []) as ProductWithImages[])];

  // Sort: featured first, then sort_order, then name.
  rows.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name);
  });

  return rows.map((p) => {
    const primary = getPrimaryImage({
      ...p,
      product_images: sortImages(p.product_images ?? []),
    });
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      prep_time_note: p.prep_time_note,
      allergens: p.allergens,
      price_cents: p.price_cents,
      featured: p.featured,
      image_url: primary?.image_url ?? null,
      image_alt: primary?.alt_text ?? null,
    };
  });
}

// Fetches a single active product (with all images) for its public detail page.
// Uses the cookieless public client; RLS only exposes active products to anon.
export async function getActiveProductBySlug(
  slug: string,
): Promise<ProductWithImages | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...(data as ProductWithImages),
    product_images: sortImages((data as ProductWithImages).product_images ?? []),
  };
}

export type { Product };
