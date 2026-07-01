import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceCart, ensureStripeCoupon, CheckoutError } from "@/lib/checkout";
import { STORE_STRIPE_CURRENCY } from "@/lib/money";
import { env } from "@/lib/env";
import { ALLOWED_SHIPPING_COUNTRIES } from "@/lib/fulfillment";
import type { OrderItemOptions } from "@/lib/types";

export const dynamic = "force-dynamic";

const optionsSchema = z
  .object({
    ribbonColourId: z.string().uuid().optional(),
    ribbonColourName: z.string().max(80).optional(),
    finish: z.enum(["wax", "sticker"]).optional(),
    stickerUpload: z
      .object({
        url: z.string().url().max(2000),
        path: z.string().max(400),
      })
      .optional(),
  })
  .optional();

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        options: optionsSchema,
      }),
    )
    .min(1, "Your cart is empty."),
  discount_code: z.string().trim().max(50).nullable().optional(),
  fulfillment_method: z.enum(["shipping", "pickup"]),
  expedite: z.boolean().optional().default(false),
});

function baseUrl(request: Request): string {
  return env.siteUrl ?? new URL(request.url).origin;
}

// A Stripe line item name that includes the chosen box options for the receipt.
function lineItemName(
  productName: string,
  options: OrderItemOptions | null,
): string {
  if (!options) return productName;
  const bits: string[] = [];
  if (options.ribbonColourName) bits.push(`Ribbon: ${options.ribbonColourName}`);
  if (options.finishLabel) bits.push(options.finishLabel);
  return bits.length > 0 ? `${productName} — ${bits.join(" · ")}` : productName;
}

// Display name for the combined shipping + expedite fee line.
function feeDisplayName(
  method: "shipping" | "pickup",
  shippingCents: number,
  expediteCents: number,
): string {
  if (method === "pickup") return "Expedited processing";
  if (expediteCents > 0) return "Shipping + expedite (Canada)";
  return shippingCents === 0
    ? "Free shipping (Canada)"
    : "Standard shipping (Canada)";
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { items, discount_code, fulfillment_method, expedite } = parsed.data;

  let orderId: string | null = null;
  const admin = createAdminClient();

  try {
    // 1-10. Recalculate everything server-side.
    const priced = await priceCart(
      items,
      discount_code ?? null,
      fulfillment_method,
      expedite,
    );

    // 11-12. Create the pending order + items.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        fulfillment_method,
        subtotal_cents: priced.subtotal_cents,
        discount_code: priced.discount?.normalized_code ?? null,
        discount_cents: priced.discount_cents,
        shipping_cents: priced.shipping_cents,
        expedite: priced.expedite,
        expedite_cents: priced.expedite_cents,
        lead_time_days: priced.lead_time_days,
        total_cents: priced.total_cents,
        payment_status: "pending",
        order_status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Failed to create order.");
    }
    orderId = order.id;

    const { error: itemsError } = await admin.from("order_items").insert(
      priced.lineItems.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
        total_cents: l.total_cents,
        options: l.options,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    // 13. Build the Stripe Checkout session.
    const stripe = getStripe();

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      priced.lineItems.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: STORE_STRIPE_CURRENCY,
          unit_amount: l.unit_price_cents,
          product_data: { name: lineItemName(l.product_name, l.options) },
        },
      }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items,
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl(request)}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(request)}/?checkout=cancelled`,
      // 14. Metadata used by the webhook.
      metadata: {
        order_id: order.id,
        discount_code: priced.discount?.normalized_code ?? "",
        fulfillment_method,
        expedite: priced.expedite ? "1" : "0",
      },
    };

    // Product-level discount coupon (percent / fixed only). Coupons apply to
    // line items only — shipping/expedite fees below are excluded.
    if (priced.discountRow && priced.discountRow.type !== "free_shipping") {
      const couponId = await ensureStripeCoupon(priced.discountRow);
      if (couponId) sessionParams.discounts = [{ coupon: couponId }];
    }

    // Shipping + expedite are charged via a fixed shipping-rate line so a percent
    // coupon never discounts them. The two are folded into one fee that always
    // equals priced.shipping_cents + priced.expedite_cents.
    if (fulfillment_method === "shipping") {
      sessionParams.shipping_address_collection = {
        allowed_countries: [
          ...ALLOWED_SHIPPING_COUNTRIES,
        ] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      };
    }

    const feeCents = priced.shipping_cents + priced.expedite_cents;
    if (fulfillment_method === "shipping" || feeCents > 0) {
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: feeCents,
              currency: STORE_STRIPE_CURRENCY,
            },
            display_name: feeDisplayName(
              fulfillment_method,
              priced.shipping_cents,
              priced.expedite_cents,
            ),
          },
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Link the order to the Stripe session for webhook lookup.
    await admin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    // 15. Return the Checkout URL for the frontend to redirect to.
    return NextResponse.json({ url: session.url });
  } catch (e) {
    // Clean up the orphaned pending order if we created one.
    if (orderId) {
      await admin.from("orders").delete().eq("id", orderId);
    }

    if (e instanceof CheckoutError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    console.error("[checkout] failed:", (e as Error)?.message);
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again." },
      { status: 500 },
    );
  }
}
