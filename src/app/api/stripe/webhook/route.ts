import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendOrderConfirmation, emailEnabled } from "@/lib/email";
import type { Order, OrderItem } from "@/lib/types";

function orderStatusUrl(token: string | null): string | undefined {
  if (!token || !env.siteUrl) return undefined;
  return `${env.siteUrl}/orders/${token}`;
}

export const dynamic = "force-dynamic";

type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
} | null;

function getShippingDetails(session: Stripe.Checkout.Session): ShippingDetails {
  const loose = session as unknown as {
    collected_information?: { shipping_details?: ShippingDetails };
    shipping_details?: ShippingDetails;
  };
  return loose.collected_information?.shipping_details ?? loose.shipping_details ?? null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  // Clear configuration error only when the route is actually invoked.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (e) {
    console.error("[stripe webhook] signature verification failed:", (e as Error)?.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id ?? null;

      // Find the order by metadata.order_id, falling back to the session id.
      const query = admin.from("orders").select("*").limit(1);
      const { data: rows } = orderId
        ? await query.eq("id", orderId)
        : await query.eq("stripe_session_id", session.id);
      const order = rows?.[0];

      if (!order) {
        console.error("[stripe webhook] order not found for session", session.id);
        return NextResponse.json({ received: true });
      }

      // Idempotency: already processed.
      if (order.payment_status === "paid") {
        return NextResponse.json({ received: true });
      }

      const shipping = getShippingDetails(session);

      await admin
        .from("orders")
        .update({
          stripe_session_id: session.id,
          payment_status: "paid",
          order_status: "paid",
          customer_email:
            session.customer_details?.email ?? session.customer_email ?? null,
          customer_name: session.customer_details?.name ?? null,
          phone: session.customer_details?.phone ?? null,
          stripe_payment_intent_id: paymentIntentId(session),
          shipping_name: shipping?.name ?? null,
          shipping_line1: shipping?.address?.line1 ?? null,
          shipping_line2: shipping?.address?.line2 ?? null,
          shipping_city: shipping?.address?.city ?? null,
          shipping_province: shipping?.address?.state ?? null,
          shipping_postal_code: shipping?.address?.postal_code ?? null,
          shipping_country: shipping?.address?.country ?? null,
        })
        .eq("id", order.id);

      // Record discount redemption exactly once, using the boolean flag as an
      // atomic guard (only the update that flips false->true increments).
      if (order.discount_code) {
        const { data: claimed } = await admin
          .from("orders")
          .update({ discount_redemption_recorded: true })
          .eq("id", order.id)
          .eq("discount_redemption_recorded", false)
          .select("id");

        if (claimed && claimed.length > 0) {
          const { data: newCount } = await admin.rpc(
            "increment_discount_redemption",
            { p_code: order.discount_code },
          );
          // NULL means the code hit its cap (or vanished) between checkout and
          // payment — the order still stands, we just log it.
          if (newCount === null) {
            console.warn(
              "[stripe webhook] discount code at cap, not incremented:",
              order.discount_code,
            );
          }
        }
      }

      // Send the confirmation email exactly once. The boolean flag is the
      // atomic guard: only the update that flips false->true sends. Skipped
      // entirely when EMAIL_PROVIDER=none. Email failures are logged but never
      // fail the webhook.
      if (emailEnabled()) {
      const { data: emailClaim } = await admin
        .from("orders")
        .update({ confirmation_email_sent: true })
        .eq("id", order.id)
        .eq("confirmation_email_sent", false)
        .select("*");

      if (emailClaim && emailClaim.length > 0) {
        const paidOrder = emailClaim[0] as Order;
        const { data: items } = await admin
          .from("order_items")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true });
        try {
          await sendOrderConfirmation(
            paidOrder,
            (items ?? []) as OrderItem[],
            { statusUrl: orderStatusUrl(paidOrder.order_token) },
          );
        } catch (e) {
          console.error(
            "[stripe webhook] confirmation email failed:",
            (e as Error)?.message,
          );
        }
      }
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id ?? null;

      const base = admin
        .from("orders")
        .update({ payment_status: "cancelled" })
        .eq("payment_status", "pending");
      if (orderId) {
        await base.eq("id", orderId);
      } else {
        await base.eq("stripe_session_id", session.id);
      }
    } else if (event.type === "charge.refunded") {
      // Sync refunds initiated from the Stripe dashboard (or our own action).
      const charge = event.data.object as Stripe.Charge;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent?.id ?? null);
      if (pi) {
        await admin
          .from("orders")
          .update({ payment_status: "refunded", order_status: "refunded" })
          .eq("stripe_payment_intent_id", pi);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe webhook] handler error:", (e as Error)?.message);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
