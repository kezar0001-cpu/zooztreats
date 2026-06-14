import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Customer-friendly fulfilment progression. Cancelled/refunded are terminal and
// shown separately.
const PICKUP_STEPS = [
  { key: "paid", label: "Order received" },
  { key: "preparing", label: "Baking" },
  { key: "ready", label: "Ready for pickup" },
  { key: "completed", label: "Picked up" },
];
const SHIPPING_STEPS = [
  { key: "paid", label: "Order received" },
  { key: "preparing", label: "Baking" },
  { key: "ready", label: "Shipped" },
  { key: "completed", label: "Delivered" },
];

function SummaryRow({
  label,
  value,
  strong,
  positive,
}: {
  label: string;
  value: string;
  strong?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong
          ? "border-t border-cream-200 pt-2 text-base font-bold text-brand-900"
          : positive
            ? "text-green-700"
            : "text-brand-800/80"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const terminal =
    order.order_status === "cancelled" || order.order_status === "refunded";
  const steps =
    order.fulfillment_method === "pickup" ? PICKUP_STEPS : SHIPPING_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === order.order_status);
  // "paid" maps to step 0; anything before counts as just received.
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blush-50 to-cream-100 px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <span className="text-3xl" aria-hidden>
            🍪
          </span>
          <h1 className="mt-2 font-serif text-2xl font-bold text-brand-900">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-brand-800/70">
            Placed {formatDate(order.created_at)}
          </p>
        </div>

        {/* Status */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-soft">
          {terminal ? (
            <div className="text-center">
              <p className="font-serif text-lg font-semibold text-brand-900">
                {order.order_status === "refunded"
                  ? "This order was refunded"
                  : "This order was cancelled"}
              </p>
              <p className="mt-1 text-sm text-brand-800/70">
                If you have questions, just reply to your confirmation email.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {steps.map((step, i) => {
                const done = i < activeIndex;
                const current = i === activeIndex;
                return (
                  <li key={step.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                        done
                          ? "bg-green-500 text-white"
                          : current
                            ? "bg-brand-600 text-white"
                            : "bg-cream-200 text-brand-800/50"
                      }`}
                      aria-hidden
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        current
                          ? "font-semibold text-brand-900"
                          : done
                            ? "text-brand-800"
                            : "text-brand-800/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Items + totals */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-soft">
          <h2 className="mb-3 font-serif text-lg font-semibold text-brand-900">
            Your order
          </h2>
          <ul className="divide-y divide-cream-200">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span className="text-brand-900">
                  {item.product_name} × {item.quantity}
                </span>
                <span className="font-medium text-brand-900">
                  {formatMoney(item.total_cents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 text-sm">
            <SummaryRow
              label="Subtotal"
              value={formatMoney(order.subtotal_cents)}
            />
            {order.discount_cents > 0 ? (
              <SummaryRow
                label={`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`}
                value={`−${formatMoney(order.discount_cents)}`}
                positive
              />
            ) : null}
            <SummaryRow
              label={order.fulfillment_method === "pickup" ? "Pickup" : "Shipping"}
              value={
                order.shipping_cents === 0
                  ? "Free"
                  : formatMoney(order.shipping_cents)
              }
            />
            <SummaryRow
              label="Total"
              value={formatMoney(order.total_cents)}
              strong
            />
          </div>
        </div>

        {/* Fulfilment details */}
        <div className="rounded-3xl border border-cream-300 bg-white p-6 shadow-soft">
          <h2 className="mb-2 font-serif text-lg font-semibold text-brand-900">
            {order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"}
          </h2>
          {order.fulfillment_method === "pickup" ? (
            <p className="text-sm text-brand-800/80">
              Local pickup in Montreal. We&apos;ll let you know when it&apos;s
              ready.
            </p>
          ) : (
            <address className="text-sm not-italic text-brand-800/80">
              {order.shipping_name ? <div>{order.shipping_name}</div> : null}
              {order.shipping_line1 ? <div>{order.shipping_line1}</div> : null}
              {order.shipping_line2 ? <div>{order.shipping_line2}</div> : null}
              <div>
                {[
                  order.shipping_city,
                  order.shipping_province,
                  order.shipping_postal_code,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {order.shipping_country ? <div>{order.shipping_country}</div> : null}
            </address>
          )}
        </div>

        <div className="text-center">
          <Link href="/" className="store-btn-secondary inline-flex">
            Back to store
          </Link>
        </div>
      </div>
    </main>
  );
}
