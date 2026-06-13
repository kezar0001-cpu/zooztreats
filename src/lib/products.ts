import { createClient } from "@/lib/supabase/server";
import type { Product, ProductImage, ProductWithImages } from "@/lib/types";

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

export type { Product };
