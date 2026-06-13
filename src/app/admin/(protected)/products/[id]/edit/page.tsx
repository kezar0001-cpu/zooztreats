import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Alert } from "@/components/admin/Alert";
import { Badge } from "@/components/admin/Badge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  updateProduct,
  uploadProductImages,
  deleteProductImage,
  setPrimaryImage,
  moveProductImage,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const product = await getProductById(id);

  if (!product) notFound();

  const images = product.product_images;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/admin/products"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Edit: {product.name}
        </h1>
      </div>

      {created ? (
        <Alert variant="success">
          Product created. You can now upload images below.
        </Alert>
      ) : null}

      <ProductForm
        action={updateProduct}
        product={product}
        submitLabel="Save changes"
      />

      {/* Images section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Images</h2>
          <p className="text-sm text-gray-500">
            Upload product photos, choose a primary image, reorder or delete.
          </p>
        </div>

        <div className="admin-card p-6">
          <ImageUploader action={uploadProductImages} productId={product.id} />
        </div>

        {images.length === 0 ? (
          <p className="text-sm text-gray-400">No images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((img, index) => (
              <div key={img.id} className="admin-card overflow-hidden">
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={img.image_url}
                    alt={img.alt_text ?? product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                  />
                  {img.is_primary ? (
                    <div className="absolute left-2 top-2">
                      <Badge color="green">Primary</Badge>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <form action={moveProductImage}>
                        <input type="hidden" name="image_id" value={img.id} />
                        <input
                          type="hidden"
                          name="product_id"
                          value={product.id}
                        />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="admin-btn-secondary !px-2 !py-1 text-xs"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveProductImage}>
                        <input type="hidden" name="image_id" value={img.id} />
                        <input
                          type="hidden"
                          name="product_id"
                          value={product.id}
                        />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === images.length - 1}
                          className="admin-btn-secondary !px-2 !py-1 text-xs"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                  </div>

                  {!img.is_primary ? (
                    <form action={setPrimaryImage}>
                      <input type="hidden" name="image_id" value={img.id} />
                      <input
                        type="hidden"
                        name="product_id"
                        value={product.id}
                      />
                      <button
                        type="submit"
                        className="admin-btn-secondary w-full !py-1 text-xs"
                      >
                        Make primary
                      </button>
                    </form>
                  ) : null}

                  <form action={deleteProductImage}>
                    <input type="hidden" name="image_id" value={img.id} />
                    <input
                      type="hidden"
                      name="product_id"
                      value={product.id}
                    />
                    <SubmitButton
                      className="admin-btn-danger w-full !py-1 text-xs"
                      pendingText="Deleting…"
                      confirm="Delete this image?"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
