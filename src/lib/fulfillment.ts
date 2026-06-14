import type { DiscountType, FulfillmentMethod } from "@/lib/types";

// Fulfillment configuration. Pure constants/helpers — safe to import on the
// client (no secrets, no server-only code).
export const SHIPPING_ENABLED = true;
export const LOCAL_PICKUP_ENABLED = true;
export const FLAT_SHIPPING_CENTS = 1500; // CA$15.00
export const ALLOWED_SHIPPING_COUNTRIES = ["CA"] as const;

// Computes the shipping charge in cents for a fulfillment method, taking a
// free_shipping discount into account. This is the single source of truth used
// by both the cart UI (display) and the checkout API (authoritative).
export function computeShippingCents(
  method: FulfillmentMethod,
  discountType?: DiscountType | null,
): number {
  if (method === "pickup") return 0;
  if (discountType === "free_shipping") return 0;
  return FLAT_SHIPPING_CENTS;
}

export function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return value === "shipping" || value === "pickup";
}
