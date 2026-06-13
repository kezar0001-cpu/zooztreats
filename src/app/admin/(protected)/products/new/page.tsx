import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New product</h1>
        <p className="mt-1 text-sm text-gray-500">
          Save the product first, then add images on the next screen.
        </p>
      </div>

      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  );
}
