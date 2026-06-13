// Shared domain types for Zooz Treats.

export type DiscountType = "percent" | "fixed" | "free_shipping";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string | null;
  active: boolean;
  featured: boolean;
  sort_order: number;
  prep_time_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
}

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  active: boolean;
  min_order_cents: number;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Standard return shape for server actions, used to drive UI success/error states.
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
