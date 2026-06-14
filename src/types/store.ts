import type { DiscountType } from "@/lib/types";

// A product as displayed in the public storefront. Derived from the DB
// `products` + `product_images` tables, flattened to the primary image.
export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  prep_time_note: string | null;
  allergens: string | null;
  price_cents: number;
  featured: boolean;
  image_url: string | null;
  image_alt: string | null;
}

// A single line in the cart. We snapshot a few display fields, but the price
// is reconciled against the live product list on load to avoid stale prices.
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
}

// Result returned by the discount validation API and stored in the cart.
export interface DiscountValidation {
  valid: boolean;
  message: string;
  normalized_code?: string;
  discount_cents: number;
  type?: DiscountType;
}

// Request body accepted by POST /api/discount/validate.
export interface DiscountValidateRequest {
  code: string;
  subtotal_cents: number;
}
