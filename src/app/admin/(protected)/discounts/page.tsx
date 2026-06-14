import Link from "next/link";
import { getDiscounts, getDiscountById } from "@/lib/discounts";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/admin/Badge";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { DiscountCode } from "@/lib/types";
import {
  createDiscount,
  updateDiscount,
  toggleDiscountActive,
  deleteDiscount,
} from "./actions";

export const dynamic = "force-dynamic";

function describeValue(d: DiscountCode): string {
  switch (d.type) {
    case "percent":
      return `${d.value}% off`;
    case "fixed":
      return `${formatMoney(d.value)} off`;
    case "free_shipping":
      return "Free shipping";
  }
}

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const discounts = await getDiscounts();
  const editing = edit ? await getDiscountById(edit) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discount codes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage promo codes for your store.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form column */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? `Edit ${editing.code}` : "New discount"}
              </h2>
              {editing ? (
                <Link
                  href="/admin/discounts"
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Cancel
                </Link>
              ) : null}
            </div>
            {editing ? (
              <DiscountForm
                key={editing.id}
                action={updateDiscount}
                discount={editing}
                submitLabel="Save changes"
              />
            ) : (
              <DiscountForm
                key="new"
                action={createDiscount}
                submitLabel="Create code"
              />
            )}
          </div>
        </div>

        {/* List column */}
        <div className="lg:col-span-2">
          {discounts.length === 0 ? (
            <div className="admin-card p-10 text-center text-gray-500">
              No discount codes yet.
            </div>
          ) : (
            <div className="admin-card overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Min order</th>
                    <th className="px-4 py-3">Uses</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discounts.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        {d.code}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {describeValue(d)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {d.min_order_cents > 0
                          ? formatMoney(d.min_order_cents)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {d.redemption_count}
                        {d.max_redemptions != null
                          ? ` / ${d.max_redemptions}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(d.expires_at)}
                      </td>
                      <td className="px-4 py-3">
                        {d.active ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="gray">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleDiscountActive}>
                            <input type="hidden" name="id" value={d.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={d.active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="admin-btn-secondary !px-2.5 !py-1 text-xs"
                            >
                              {d.active ? "Off" : "On"}
                            </button>
                          </form>
                          <Link
                            href={`/admin/discounts?edit=${d.id}`}
                            className="admin-btn-secondary !px-2.5 !py-1 text-xs"
                          >
                            Edit
                          </Link>
                          <form action={deleteDiscount}>
                            <input type="hidden" name="id" value={d.id} />
                            <SubmitButton
                              className="admin-btn-danger !px-2.5 !py-1 text-xs"
                              pendingText="…"
                              confirm={`Delete code ${d.code}?`}
                            >
                              Delete
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
