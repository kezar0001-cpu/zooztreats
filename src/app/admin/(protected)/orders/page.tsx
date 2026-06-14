import Link from "next/link";
import { getOrders } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { PaymentBadge, OrderStatusBadge } from "@/components/admin/OrderBadges";

export const dynamic = "force-dynamic";

const STATUS_TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  })),
];

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page } = await searchParams;

  const activeStatus = (
    status && ORDER_STATUSES.includes(status as OrderStatus) ? status : "all"
  ) as OrderStatus | "all";
  const search = q?.trim() ?? "";
  const currentPage = Math.max(1, Number(page) || 1);

  const result = await getOrders({
    status: activeStatus,
    q: search,
    page: currentPage,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          {result.total} order{result.total === 1 ? "" : "s"}
          {activeStatus !== "all" ? ` · ${activeStatus}` : ""}
          {search ? ` · matching “${search}”` : ""}
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === activeStatus;
          return (
            <Link
              key={tab.value}
              href={`/admin/orders${buildQuery({ status: tab.value, q: search })}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="get" className="flex gap-2">
        {activeStatus !== "all" ? (
          <input type="hidden" name="status" value={activeStatus} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by customer name or email…"
          className="admin-input max-w-xs"
          aria-label="Search orders"
        />
        <button type="submit" className="admin-btn-secondary">
          Search
        </button>
        {search ? (
          <Link
            href={`/admin/orders${buildQuery({ status: activeStatus })}`}
            className="admin-btn-secondary"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {result.orders.length === 0 ? (
        <div className="admin-card p-10 text-center text-gray-500">
          No orders found.
        </div>
      ) : (
        <>
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
                {result.orders.map((o) => (
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

          {/* Pagination */}
          {result.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex gap-2">
                {result.page > 1 ? (
                  <Link
                    href={`/admin/orders${buildQuery({
                      status: activeStatus,
                      q: search,
                      page: result.page - 1,
                    })}`}
                    className="admin-btn-secondary"
                  >
                    ← Previous
                  </Link>
                ) : null}
                {result.page < result.totalPages ? (
                  <Link
                    href={`/admin/orders${buildQuery({
                      status: activeStatus,
                      q: search,
                      page: result.page + 1,
                    })}`}
                    className="admin-btn-secondary"
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
