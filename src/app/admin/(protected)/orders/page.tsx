import Link from "next/link";
import { getOrders } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PaymentBadge, OrderStatusBadge } from "@/components/admin/OrderBadges";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          {orders.length} order{orders.length === 1 ? "" : "s"} total
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="admin-card p-10 text-center text-gray-500">
          No orders yet.
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {o.customer_email ?? "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {o.fulfillment_method}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={o.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.order_status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {o.discount_code ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatMoney(o.total_cents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="admin-btn-secondary !px-3 !py-1.5"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
