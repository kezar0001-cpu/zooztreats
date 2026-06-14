import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { evaluateDiscount } from "@/lib/discounts";
import { computeShippingCents } from "@/lib/fulfillment";
import { STORE_STRIPE_CURRENCY } from "@/lib/money";
import type {
  DiscountCode,
  FulfillmentMethod,
} from "@/lib/types";
import type { DiscountValidation } from "@/types/store";

// Thrown for user-correctable problems (unknown product, invalid code, etc).
// The route turns these into 400 responses with the message shown to the user.
export class CheckoutError extends Error {}

export interface RequestedItem {
  product_id: string;
  quantity: number;
}

export interface PricedLineItem {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
}

export interface PricedCart {
  lineItems: PricedLineItem[];
  subtotal_cents: number;
  discountRow: DiscountCode | null;
  discount: DiscountValidation | null;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
}

// Recalculates the entire cart server-side. NEVER trusts client-supplied prices,
// names, discounts, shipping, or totals.
export async function priceCart(
  items: RequestedItem[],
  discountCodeRaw: string | null,
  fulfillment: FulfillmentMethod,
): Promise<PricedCart> {
  if (items.length === 0) {
    throw new CheckoutError("Your cart is empty.");
  }

  const admin = createAdminClient();
  const ids = Array.from(new Set(items.map((i) => i.product_id)));

  const { data: products, error } = await admin
    .from("products")
    .select("id, name, price_cents, active")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  const lineItems: PricedLineItem[] = [];
  for (const item of items) {
    const product = byId.get(item.product_id);
    if (!product) {
      throw new CheckoutError(
        "One or more items in your cart are no longer available. Please refresh and try again.",
      );
    }
    if (!product.active) {
      throw new CheckoutError(
        `"${product.name}" is no longer available. Please remove it from your cart.`,
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutError(`Invalid quantity for "${product.name}".`);
    }
    lineItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: product.price_cents,
      quantity: item.quantity,
      total_cents: product.price_cents * item.quantity,
    });
  }

  const subtotal_cents = lineItems.reduce((s, l) => s + l.total_cents, 0);

  // Discount (single code only).
  let discountRow: DiscountCode | null = null;
  let discount: DiscountValidation | null = null;
  let discount_cents = 0;

  const code = (discountCodeRaw ?? "").trim().toUpperCase();
  if (code) {
    const { data: row } = await admin
      .from("discount_codes")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    discountRow = (row as DiscountCode) ?? null;

    const evaluation = evaluateDiscount(discountRow, subtotal_cents);
    if (!evaluation.valid) {
      throw new CheckoutError(evaluation.message);
    }
    discount = evaluation;
    discount_cents = evaluation.discount_cents;
  }

  const shipping_cents = computeShippingCents(fulfillment, discount?.type);
  const total_cents = Math.max(
    0,
    subtotal_cents - discount_cents + shipping_cents,
  );

  return {
    lineItems,
    subtotal_cents,
    discountRow,
    discount,
    discount_cents,
    shipping_cents,
    total_cents,
  };
}

// Creates or reuses a Stripe coupon for a percent/fixed discount. free_shipping
// never gets a coupon (it's applied by zeroing shipping). Returns the coupon id,
// or null when no product-level coupon should be applied.
export async function ensureStripeCoupon(
  discountRow: DiscountCode,
): Promise<string | null> {
  if (discountRow.type === "free_shipping") return null;

  const stripe = getStripe();

  // Reuse a stored coupon if it still exists in Stripe.
  if (discountRow.stripe_coupon_id) {
    try {
      const existing = await stripe.coupons.retrieve(
        discountRow.stripe_coupon_id,
      );
      if (existing && !existing.deleted) return existing.id;
    } catch {
      // Fall through and create a fresh coupon.
    }
  }

  const params =
    discountRow.type === "percent"
      ? {
          percent_off: discountRow.value,
          duration: "once" as const,
          name: `Zooz ${discountRow.code}`,
        }
      : {
          amount_off: discountRow.value,
          currency: STORE_STRIPE_CURRENCY,
          duration: "once" as const,
          name: `Zooz ${discountRow.code}`,
        };

  const coupon = await stripe.coupons.create(params);

  // Store for reuse (best effort).
  const admin = createAdminClient();
  await admin
    .from("discount_codes")
    .update({ stripe_coupon_id: coupon.id })
    .eq("id", discountRow.id);

  return coupon.id;
}
