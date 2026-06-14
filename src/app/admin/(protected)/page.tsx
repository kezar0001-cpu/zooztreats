import Link from "next/link";
import { getProductCounts } from "@/lib/products";
import { getDiscountCount } from "@/lib/discounts";
import { getOrderStats } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PaymentBadge, OrderStatusBadge } from "@/components/admin/OrderBadges";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const card = (
    <div className="admin-card p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function AdminDashboardPage() {
  const [counts, discountCount, stats] = await Promise.all([
    getProductCounts(),
    getDiscountCount(),
    getOrderStats(),
  ]);

  const quickActions = [
    { href: "/admin/products/new", label: "Add Product", primary: true },
    { href: "/admin/orders", label: "View Orders", primary: false },
    { href: "/admin/products", label: "Manage Products", primary: false },
    { href: "/admin/discounts", label: "Manage Discounts", primary: false },
    { href: "/", label: "View Store", primary: false, external: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of sales, orders, and your catalog.
        </p>
      </div>

      {/* Business metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (paid)"
          value={formatMoney(stats.paidRevenueCents)}
          hint={`${stats.paidCount} paid order${stats.paidCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Needs fulfilment"
          value={stats.pendingFulfilmentCount}
          hint="Paid + preparing"
          href="/admin/orders?status=paid"
        />
        <StatCard
          label="Ready"
          value={stats.byStatus.ready}
          hint="Awaiting pickup/handoff"
          href="/admin/orders?status=ready"
        />
        <StatCard
          label="Orders today"
          value={stats.ordersToday}
          href="/admin/orders"
        />
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent orders
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm text-brand-700 hover:text-brand-800"
          >
            View all →
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="admin-card p-8 text-center text-sm text-gray-500">
            No orders yet — share your store link to get your first order.
          </div>
        ) : (
          <div className="admin-card divide-y divide-gray-100">
            {stats.recent.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {o.customer_email ?? "Guest"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(o.created_at)} · {o.fulfillment_method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PaymentBadge status={o.payment_status} />
                  <OrderStatusBadge status={o.order_status} />
                  <span className="w-20 text-right text-sm font-semibold text-gray-900">
                    {formatMoney(o.total_cents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Catalog */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active products"
          value={counts.active}
          href="/admin/products"
        />
        <StatCard
          label="Inactive products"
          value={counts.inactive}
          href="/admin/products"
        />
        <StatCard
          label="Discount codes"
          value={discountCount}
          href="/admin/discounts"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              target={action.external ? "_blank" : undefined}
              className={action.primary ? "admin-btn-primary" : "admin-btn-secondary"}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
