import type { BoxType, DiscountType } from "@/lib/types";

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
  box_type: BoxType | null;
  image_url: string | null;
  image_alt: string | null;
}

// A customer-uploaded sticker design, stored in the customization-uploads bucket.
export interface StickerUpload {
  url: string;
  path: string;
}

// Customization the customer chose for a party / premium box.
export interface CartItemOptions {
  ribbonColourId?: string;
  ribbonColourName?: string;
  finish?: "wax" | "sticker"; // premium only
  stickerUpload?: StickerUpload; // party always; premium when finish === "sticker"
}

// A single line in the cart. We snapshot a few display fields, but the price
// is reconciled against the live product list on load to avoid stale prices.
// `key` uniquely identifies the line (product + chosen options) so the same
// product with different customization is a separate line.
export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
  boxType: BoxType | null;
  options?: CartItemOptions;
  optionsSurchargeCents: number;
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
