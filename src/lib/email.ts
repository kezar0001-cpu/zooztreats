import "server-only";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";

// Transactional email via the Resend REST API. We call the HTTP endpoint
// directly (no SDK dependency) so this works in any deployment/build
// environment. When RESEND_API_KEY is unset, sends are skipped gracefully.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

// Whether custom transactional email is enabled. Off by default
// (EMAIL_PROVIDER=none) — the app uses Stripe receipts + the order status page.
export function emailEnabled(): boolean {
  return env.emailProvider !== "none";
}

// Low-level send. Returns true on success. Never throws — callers (e.g. the
// Stripe webhook) must not fail because email is disabled or undeliverable.
async function sendEmail(input: SendEmailInput): Promise<boolean> {
  // EMAIL_PROVIDER=none: never attempt to send (and never touch Resend).
  if (env.emailProvider === "none") return false;

  const apiKey = env.resendApiKey;
  if (!apiKey) {
    console.warn(
      "[email] EMAIL_PROVIDER=resend but RESEND_API_KEY is not set — skipping:",
      input.subject,
    );
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "[email] send failed:",
        res.status,
        detail.slice(0, 300),
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send error:", (e as Error)?.message);
    return false;
  }
}

// --- Templates -------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemsRows(items: OrderItem[]): string {
  return items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0e9e0;color:#3f342b;">
            ${escapeHtml(i.product_name)} &times; ${i.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0e9e0;text-align:right;color:#3f342b;">
            ${formatMoney(i.total_cents)}
          </td>
        </tr>`,
    )
    .join("");
}

function summaryRow(label: string, value: string, strong = false): string {
  const weight = strong ? "700" : "400";
  return `
    <tr>
      <td style="padding:4px 0;color:#6b5d4f;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;text-align:right;font-weight:${weight};color:#3f342b;">${escapeHtml(value)}</td>
    </tr>`;
}

function fulfillmentLine(order: Order): string {
  if (order.fulfillment_method === "pickup") {
    return "Local pickup in Montreal";
  }
  const parts = [
    order.shipping_name,
    order.shipping_line1,
    order.shipping_line2,
    [order.shipping_city, order.shipping_province, order.shipping_postal_code]
      .filter(Boolean)
      .join(", "),
    order.shipping_country,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join("<br/>") : "Ship within Canada";
}

function orderEmailHtml(
  order: Order,
  items: OrderItem[],
  opts: { heading: string; intro: string; statusUrl?: string },
): string {
  const discountRow =
    order.discount_cents > 0 || order.discount_code
      ? summaryRow(
          `Discount${order.discount_code ? ` (${order.discount_code})` : ""}`,
          `−${formatMoney(order.discount_cents)}`,
        )
      : "";

  const statusButton = opts.statusUrl
    ? `<p style="margin:24px 0 0;">
         <a href="${opts.statusUrl}" style="display:inline-block;background:#b06a3b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;">
           View your order
         </a>
       </p>`
    : "";

  return `
  <div style="background:#faf6f0;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #efe6da;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 28px 8px;">
        <p style="font-size:24px;margin:0;">🍪 <strong style="color:#7a4a26;">Zooz Treats</strong></p>
        <h1 style="font-size:22px;color:#3f342b;margin:18px 0 6px;">${escapeHtml(opts.heading)}</h1>
        <p style="color:#6b5d4f;margin:0;line-height:1.5;">${escapeHtml(opts.intro)}</p>
        ${statusButton}
      </div>
      <div style="padding:20px 28px;">
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#9b8b7a;margin:0 0 8px;">Order summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${itemsRows(items)}
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:14px;">
          ${summaryRow("Subtotal", formatMoney(order.subtotal_cents))}
          ${discountRow}
          ${summaryRow(
            order.fulfillment_method === "pickup" ? "Pickup" : "Shipping",
            order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents),
          )}
          ${summaryRow("Total", formatMoney(order.total_cents), true)}
        </table>
      </div>
      <div style="padding:0 28px 28px;">
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#9b8b7a;margin:0 0 8px;">
          ${order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"}
        </h2>
        <p style="color:#3f342b;margin:0;line-height:1.5;font-size:14px;">${fulfillmentLine(order)}</p>
      </div>
      <div style="padding:18px 28px;background:#faf6f0;border-top:1px solid #efe6da;">
        <p style="color:#9b8b7a;font-size:12px;margin:0;">
          Order #${order.id.slice(0, 8)} · All prices in CAD
        </p>
      </div>
    </div>
  </div>`;
}

// --- Public API ------------------------------------------------------------

// Sends the buyer their confirmation and notifies the owner of a new paid
// order. Returns true if at least the customer email was sent.
export async function sendOrderConfirmation(
  order: Order,
  items: OrderItem[],
  opts: { statusUrl?: string } = {},
): Promise<boolean> {
  if (!emailEnabled()) return false;

  let customerSent = false;

  if (order.customer_email) {
    customerSent = await sendEmail({
      to: order.customer_email,
      subject: `Thanks for your Zooz Treats order #${order.id.slice(0, 8)}`,
      html: orderEmailHtml(order, items, {
        heading: "Thank you for your order!",
        intro:
          "We've received your order and payment. We'll be in touch with updates as we get baking.",
        statusUrl: opts.statusUrl,
      }),
    });
  }

  if (env.orderNotificationEmail) {
    await sendEmail({
      to: env.orderNotificationEmail,
      replyTo: order.customer_email ?? undefined,
      subject: `New order #${order.id.slice(0, 8)} — ${formatMoney(order.total_cents)}`,
      html: orderEmailHtml(order, items, {
        heading: "New paid order",
        intro: `${order.customer_name ?? order.customer_email ?? "A customer"} just placed an order.`,
      }),
    });
  }

  return customerSent;
}

// Notifies the customer that their order status changed (e.g. ready for pickup).
export async function sendOrderStatusUpdate(
  order: Order,
  items: OrderItem[],
  opts: { statusUrl?: string } = {},
): Promise<boolean> {
  if (!emailEnabled()) return false;
  if (!order.customer_email) return false;

  const messages: Record<string, { heading: string; intro: string }> = {
    preparing: {
      heading: "We're baking your order",
      intro: "Good news — your treats are now being prepared.",
    },
    ready: {
      heading:
        order.fulfillment_method === "pickup"
          ? "Your order is ready for pickup"
          : "Your order is ready",
      intro:
        order.fulfillment_method === "pickup"
          ? "Your order is ready for pickup in Montreal. See you soon!"
          : "Your order is ready and will be on its way shortly.",
    },
    completed: {
      heading: "Your order is complete",
      intro: "Thanks for choosing Zooz Treats — we hope you enjoy every bite!",
    },
  };

  const copy = messages[order.order_status];
  if (!copy) return false;

  return sendEmail({
    to: order.customer_email,
    subject: `Update on your Zooz Treats order #${order.id.slice(0, 8)}`,
    html: orderEmailHtml(order, items, { ...copy, statusUrl: opts.statusUrl }),
  });
}
