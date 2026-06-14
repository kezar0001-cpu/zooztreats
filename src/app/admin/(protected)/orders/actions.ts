"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendOrderStatusUpdate } from "@/lib/email";
import {
  ADMIN_SETTABLE_ORDER_STATUSES,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/types";
import type { ActionResult } from "@/lib/types";

function orderStatusUrl(token: string | null): string | undefined {
  if (!token || !env.siteUrl) return undefined;
  return `${env.siteUrl}/orders/${token}`;
}

// Statuses that should trigger a customer notification email.
const NOTIFY_STATUSES: OrderStatus[] = ["preparing", "ready", "completed"];

export async function updateOrderStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("order_status") ?? "") as OrderStatus;

  if (!id) return { ok: false, error: "Missing order id." };
  if (!ADMIN_SETTABLE_ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid order status." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ order_status: status })
    .eq("id", id)
    .select("*, order_items(*)")
    .single();

  if (error) return { ok: false, error: error.message };

  // Notify the customer for fulfilment milestones. Best-effort: never fail the
  // action because an email couldn't be sent.
  if (updated && NOTIFY_STATUSES.includes(status)) {
    const order = updated as Order & { order_items: OrderItem[] };
    try {
      await sendOrderStatusUpdate(order, order.order_items ?? [], {
        statusUrl: orderStatusUrl(order.order_token),
      });
    } catch (e) {
      console.error("[updateOrderStatus] email failed:", (e as Error)?.message);
    }
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, data: undefined, message: `Order marked ${status}.` };
}

// Issues a full Stripe refund for a paid order, then records it locally.
export async function refundOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing order id." };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!order) return { ok: false, error: "Order not found." };
  if (order.payment_status !== "paid") {
    return { ok: false, error: "Only paid orders can be refunded." };
  }
  if (!order.stripe_payment_intent_id) {
    return {
      ok: false,
      error: "This order has no Stripe payment to refund.",
    };
  }

  try {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    });
  } catch (e) {
    console.error("[refundOrder] Stripe refund failed:", (e as Error)?.message);
    return {
      ok: false,
      error: "Stripe refund failed. Please check the Stripe dashboard.",
    };
  }

  // The charge.refunded webhook will also sync this, but update immediately for
  // a responsive admin UI.
  await supabase
    .from("orders")
    .update({ payment_status: "refunded", order_status: "refunded" })
    .eq("id", id);

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, data: undefined, message: "Order refunded." };
}
