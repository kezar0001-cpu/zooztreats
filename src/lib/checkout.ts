import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { evaluateDiscount } from "@/lib/discounts";
import { computeShippingCents } from "@/lib/fulfillment";
import { STORE_STRIPE_CURRENCY } from "@/lib/money";
import {
  DEFAULT_SETTINGS,
  computeExpediteCents,
  effectiveLeadTimeDays,
  toPublicStoreConfig,
} from "@/lib/store-config";
import type {
  BoxType,
  DiscountCode,
  FulfillmentMethod,
  OrderItemOptions,
  RibbonColour,
  Settings,
} from "@/lib/types";
import type { DiscountValidation } from "@/types/store";

// Thrown for user-correctable problems (unknown product, invalid code, etc).
// The route turns these into 400 responses with the message shown to the user.
export class CheckoutError extends Error {}

export interface RequestedItemOptions {
  ribbonColourId?: string;
  finish?: "wax" | "sticker";
  stickerUpload?: { url: string; path: string };
}

export interface RequestedItem {
  product_id: string;
  quantity: number;
  options?: RequestedItemOptions;
}

export interface PricedLineItem {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
  options: OrderItemOptions | null;
}

export interface PricedCart {
  lineItems: PricedLineItem[];
  subtotal_cents: number;
  discountRow: DiscountCode | null;
  discount: DiscountValidation | null;
  discount_cents: number;
  shipping_cents: number;
  expedite: boolean;
  expedite_cents: number;
  lead_time_days: number;
  total_cents: number;
}

// Authoritatively resolves the customization for one line against its box type,
// returning the priced options snapshot + total surcharge. Throws a
// CheckoutError for any missing/invalid required choice.
function priceOptions(
  productName: string,
  boxType: BoxType | null,
  requested: RequestedItemOptions | undefined,
  settings: Settings,
  ribbonById: Map<string, RibbonColour>,
): { options: OrderItemOptions | null; surcharge_cents: number } {
  if (boxType !== "party" && boxType !== "premium") {
    return { options: null, surcharge_cents: 0 };
  }

  const opt = requested ?? {};

  // Ribbon colour (required for both party and premium).
  const ribbon = opt.ribbonColourId ? ribbonById.get(opt.ribbonColourId) : undefined;
  if (!ribbon || !ribbon.active) {
    throw new CheckoutError(`Please choose a ribbon colour for "${productName}".`);
  }
  const ribbonSurcharge = ribbon.surcharge_cents;

  let finish: "wax" | "sticker" | undefined;
  let finishLabel: string;
  let finishSurcharge: number;
  let stickerRequired: boolean;

  if (boxType === "party") {
    // Party box always includes an uploaded custom sticker.
    finishLabel = "Custom sticker";
    finishSurcharge = settings.party_sticker_surcharge_cents;
    stickerRequired = true;
  } else {
    // Premium box: wax seal or custom sticker.
    if (opt.finish !== "wax" && opt.finish !== "sticker") {
      throw new CheckoutError(`Please choose a finish for "${productName}".`);
    }
    finish = opt.finish;
    if (finish === "wax") {
      finishLabel = "Wax seal";
      finishSurcharge = settings.premium_wax_surcharge_cents;
      stickerRequired = false;
    } else {
      finishLabel = "Custom sticker";
      finishSurcharge = settings.premium_sticker_surcharge_cents;
      stickerRequired = true;
    }
  }

  let stickerUploadUrl: string | undefined;
  let stickerUploadPath: string | undefined;
  if (stickerRequired) {
    if (!opt.stickerUpload?.url || !opt.stickerUpload?.path) {
      throw new CheckoutError(
        `Please upload a sticker design for "${productName}".`,
      );
    }
    stickerUploadUrl = opt.stickerUpload.url;
    stickerUploadPath = opt.stickerUpload.path;
  }

  const surcharge_cents = ribbonSurcharge + finishSurcharge;

  const options: OrderItemOptions = {
    boxType,
    ribbonColourName: ribbon.name,
    ribbonSurchargeCents: ribbonSurcharge,
    finish,
    finishLabel,
    finishSurchargeCents: finishSurcharge,
    stickerUploadUrl,
    stickerUploadPath,
    basePriceCents: 0, // filled in by caller (needs product price)
    surchargeCents: surcharge_cents,
  };

  return { options, surcharge_cents };
}

// Recalculates the entire cart server-side. NEVER trusts client-supplied prices,
// names, discounts, shipping, options, or totals.
export async function priceCart(
  items: RequestedItem[],
  discountCodeRaw: string | null,
  fulfillment: FulfillmentMethod,
  expediteRequested: boolean,
): Promise<PricedCart> {
  if (items.length === 0) {
    throw new CheckoutError("Your cart is empty.");
  }

  const admin = createAdminClient();
  const ids = Array.from(new Set(items.map((i) => i.product_id)));

  const [productsRes, settingsRes, ribbonsRes] = await Promise.all([
    admin
      .from("products")
      .select("id, name, price_cents, active, box_type")
      .in("id", ids),
    admin.from("settings").select("*").eq("id", true).maybeSingle(),
    admin.from("ribbon_colours").select("*"),
  ]);

  if (productsRes.error) {
    throw new Error(`Failed to load products: ${productsRes.error.message}`);
  }

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...((settingsRes.data as Partial<Settings> | null) ?? {}),
  };
  const ribbonById = new Map(
    ((ribbonsRes.data as RibbonColour[] | null) ?? []).map((r) => [r.id, r]),
  );

  const byId = new Map((productsRes.data ?? []).map((p) => [p.id, p]));

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

    const { options, surcharge_cents } = priceOptions(
      product.name,
      (product.box_type as BoxType | null) ?? null,
      item.options,
      settings,
      ribbonById,
    );
    if (options) options.basePriceCents = product.price_cents;

    const unit_price_cents = product.price_cents + surcharge_cents;
    lineItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price_cents,
      quantity: item.quantity,
      total_cents: unit_price_cents * item.quantity,
      options,
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

  // Expedite (rush) surcharge + promised lead time.
  const config = toPublicStoreConfig(settings);
  const expedite = expediteRequested && config.expedite_enabled;
  const expedite_cents = expedite
    ? computeExpediteCents(config, subtotal_cents)
    : 0;
  const lead_time_days = effectiveLeadTimeDays(config, expedite);

  const total_cents = Math.max(
    0,
    subtotal_cents - discount_cents + shipping_cents + expedite_cents,
  );

  return {
    lineItems,
    subtotal_cents,
    discountRow,
    discount,
    discount_cents,
    shipping_cents,
    expedite,
    expedite_cents,
    lead_time_days,
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
