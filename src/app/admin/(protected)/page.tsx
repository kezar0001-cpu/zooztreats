import Link from "next/link";
import { getProductCounts } from "@/lib/products";
import { getDiscountCount } from "@/lib/discounts";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="admin-card p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [counts, discountCount] = await Promise.all([
    getProductCounts(),
    getDiscountCount(),
  ]);

  const quickActions = [
    { href: "/admin/products/new", label: "Add Product", primary: true },
    { href: "/admin/products", label: "Manage Products", primary: false },
    { href: "/admin/discounts", label: "Manage Discounts", primary: false },
    { href: "/", label: "View Store", primary: false, external: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your store catalog and discounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active products" value={counts.active} />
        <StatCard label="Inactive products" value={counts.inactive} />
        <StatCard label="Discount codes" value={discountCount} />
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
