import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PaymentBadge, OrderStatusBadge } from "@/components/admin/OrderBadges";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const hasShipping =
    order.fulfillment_method === "shipping" &&
    (order.shipping_line1 || order.shipping_city);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Order {order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PaymentBadge status={order.payment_status} />
          <OrderStatusBadge status={order.order_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer */}
        <div className="admin-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Customer
          </h2>
          <dl>
            <Row label="Email" value={order.customer_email ?? "—"} />
            <Row label="Name" value={order.customer_name ?? "—"} />
            <Row label="Phone" value={order.phone ?? "—"} />
            <Row
              label="Fulfillment"
              value={
                <span className="capitalize">{order.fulfillment_method}</span>
              }
            />
          </dl>
        </div>

        {/* Shipping */}
        <div className="admin-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Shipping address
          </h2>
          {hasShipping ? (
            <address className="text-sm not-italic text-gray-700">
              {order.shipping_name ? <div>{order.shipping_name}</div> : null}
              {order.shipping_line1 ? <div>{order.shipping_line1}</div> : null}
              {order.shipping_line2 ? <div>{order.shipping_line2}</div> : null}
              <div>
                {[order.shipping_city, order.shipping_province, order.shipping_postal_code]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {order.shipping_country ? <div>{order.shipping_country}</div> : null}
            </address>
          ) : (
            <p className="text-sm text-gray-400">
              {order.fulfillment_method === "pickup"
                ? "Local pickup in Montreal"
                : "—"}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="admin-card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.order_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-gray-900">{item.product_name}</td>
                <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                <td className="px-4 py-3 text-gray-700">
                  {formatMoney(item.unit_price_cents)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatMoney(item.total_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <dl className="ml-auto max-w-xs">
            <Row label="Subtotal" value={formatMoney(order.subtotal_cents)} />
            {order.discount_cents > 0 || order.discount_code ? (
              <Row
                label={`Discount${order.discount_code ? ` (${order.discount_code})` : ""}`}
                value={`−${formatMoney(order.discount_cents)}`}
              />
            ) : null}
            <Row label="Shipping" value={formatMoney(order.shipping_cents)} />
            <div className="mt-1 border-t border-gray-200 pt-2">
              <Row
                label="Total"
                value={
                  <span className="text-base">
                    {formatMoney(order.total_cents)}
                  </span>
                }
              />
            </div>
          </dl>
        </div>
      </div>

      {/* Stripe + status */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="admin-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Payment
          </h2>
          <dl>
            <Row
              label="Payment status"
              value={<PaymentBadge status={order.payment_status} />}
            />
            <Row
              label="Stripe session"
              value={
                <span className="break-all font-mono text-xs">
                  {order.stripe_session_id ?? "—"}
                </span>
              }
            />
            <Row
              label="Payment intent"
              value={
                <span className="break-all font-mono text-xs">
                  {order.stripe_payment_intent_id ?? "—"}
                </span>
              }
            />
          </dl>
        </div>

        <div className="admin-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Update status
          </h2>
          <OrderStatusForm orderId={order.id} current={order.order_status} />
        </div>
      </div>
    </div>
  );
}
