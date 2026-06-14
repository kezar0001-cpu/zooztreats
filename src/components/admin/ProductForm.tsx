"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { slugify } from "@/lib/validation";
import { centsToDollarsString } from "@/lib/format";
import type { ActionResult, ProductWithImages } from "@/lib/types";

type ProductAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

export function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: ProductAction;
  product?: ProductWithImages;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product?.slug));

  // Auto-generate slug from name until the user manually edits the slug.
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Saved."}</Alert>
      ) : null}

      <div className="admin-card space-y-5 p-6">
        <div>
          <label htmlFor="name" className="admin-label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FieldError messages={errors?.name} />
        </div>

        <div>
          <label htmlFor="slug" className="admin-label">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            className="admin-input font-mono"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Used in the product URL. Lowercase letters, numbers and hyphens.
          </p>
          <FieldError messages={errors?.slug} />
        </div>

        <div>
          <label htmlFor="description" className="admin-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="admin-input"
            defaultValue={product?.description ?? ""}
          />
          <FieldError messages={errors?.description} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="admin-label">
              Price (CAD)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                id="price"
                name="price"
                type="text"
                inputMode="decimal"
                className="admin-input pl-7"
                placeholder="18.00"
                defaultValue={
                  product ? centsToDollarsString(product.price_cents) : ""
                }
                required
              />
            </div>
            <FieldError messages={errors?.price_cents} />
          </div>

          <div>
            <label htmlFor="category" className="admin-label">
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              className="admin-input"
              placeholder="Cookies"
              defaultValue={product?.category ?? ""}
            />
            <FieldError messages={errors?.category} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="prep_time_note" className="admin-label">
              Prep time note
            </label>
            <input
              id="prep_time_note"
              name="prep_time_note"
              type="text"
              className="admin-input"
              placeholder="Baked fresh — allow 2-3 days."
              defaultValue={product?.prep_time_note ?? ""}
            />
            <FieldError messages={errors?.prep_time_note} />
          </div>

          <div>
            <label htmlFor="sort_order" className="admin-label">
              Sort order
            </label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              className="admin-input"
              defaultValue={product?.sort_order ?? 0}
            />
            <FieldError messages={errors?.sort_order} />
          </div>
        </div>

        <div>
          <label htmlFor="allergens" className="admin-label">
            Allergens / ingredients
          </label>
          <textarea
            id="allergens"
            name="allergens"
            rows={2}
            className="admin-input"
            placeholder="Contains: wheat, eggs, dairy. May contain traces of nuts."
            defaultValue={product?.allergens ?? ""}
          />
          <p className="mt-1 text-xs text-gray-400">
            Shown on the product page to help customers with dietary needs.
          </p>
          <FieldError messages={errors?.allergens} />
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product ? product.active : true}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
            />
            Active (visible in store)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product ? product.featured : false}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
            />
            Featured
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
