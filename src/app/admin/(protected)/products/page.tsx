import Link from "next/link";
import { getProducts, getPrimaryImage } from "@/lib/products";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/admin/Badge";
import { ProductThumb } from "@/components/admin/ProductThumb";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { deleteProduct, toggleProductActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.length} product{products.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Link href="/admin/products/new" className="admin-btn-primary">
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="text-gray-500">No products yet.</p>
          <Link
            href="/admin/products/new"
            className="admin-btn-primary mt-4 inline-flex"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="admin-card hidden overflow-hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => {
                  const primary = getPrimaryImage(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={primary?.image_url ?? null}
                            alt={primary?.alt_text ?? product.name}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {product.category || "—"} · /{product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatMoney(product.price_cents)}
                      </td>
                      <td className="px-4 py-3">
                        {product.active ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="gray">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {product.featured ? (
                          <Badge color="amber">Featured</Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleProductActive}>
                            <input type="hidden" name="id" value={product.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={product.active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="admin-btn-secondary !px-3 !py-1.5"
                            >
                              {product.active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="admin-btn-secondary !px-3 !py-1.5"
                          >
                            Edit
                          </Link>
                          <form action={deleteProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <SubmitButton
                              className="admin-btn-danger !px-3 !py-1.5"
                              pendingText="Deleting…"
                              confirm={`Delete "${product.name}"? This cannot be undone.`}
                            >
                              Delete
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => {
              const primary = getPrimaryImage(product);
              return (
                <div key={product.id} className="admin-card p-4">
                  <div className="flex items-start gap-3">
                    <ProductThumb
                      src={primary?.image_url ?? null}
                      alt={primary?.alt_text ?? product.name}
                      size={64}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatMoney(product.price_cents)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {product.active ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="gray">Inactive</Badge>
                        )}
                        {product.featured ? (
                          <Badge color="amber">Featured</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={toggleProductActive}>
                      <input type="hidden" name="id" value={product.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={product.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="admin-btn-secondary !px-3 !py-1.5"
                      >
                        {product.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="admin-btn-secondary !px-3 !py-1.5"
                    >
                      Edit
                    </Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <SubmitButton
                        className="admin-btn-danger !px-3 !py-1.5"
                        pendingText="Deleting…"
                        confirm={`Delete "${product.name}"? This cannot be undone.`}
                      >
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
