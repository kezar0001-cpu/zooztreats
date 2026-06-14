"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "./ProductImage";
import { QuantitySelector } from "./QuantitySelector";
import type { StoreProduct } from "@/types/store";

export function ProductCard({ product }: { product: StoreProduct }) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product, qty);
    toast(`${product.name} added to cart`);
    setQty(1);
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-cream-300 bg-white shadow-soft transition-transform duration-200 hover:-translate-y-1">
      <Link href={`/products/${product.slug}`} aria-label={product.name}>
        <ProductImage
          src={product.image_url}
          alt={product.image_alt ?? product.name}
          className="aspect-[4/3] w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl font-semibold text-brand-900">
            <Link
              href={`/products/${product.slug}`}
              className="transition-colors hover:text-brand-700"
            >
              {product.name}
            </Link>
          </h3>
          <span className="whitespace-nowrap text-lg font-bold text-brand-700">
            {formatMoney(product.price_cents)}
          </span>
        </div>

        {product.category ? (
          <span className="mt-1 inline-block w-fit rounded-full bg-blush-100 px-2.5 py-0.5 text-xs font-medium text-blush-500">
            {product.category}
          </span>
        ) : null}

        {product.description ? (
          <p className="mt-3 text-sm leading-relaxed text-brand-800/70">
            {product.description}
          </p>
        ) : null}

        {product.prep_time_note ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-700/70">
            <span aria-hidden>⏱️</span>
            {product.prep_time_note}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 pt-1">
          <QuantitySelector value={qty} onChange={setQty} ariaLabel="Quantity" />
          <button
            type="button"
            onClick={handleAdd}
            className="store-btn-primary !px-5 !py-2.5 text-sm"
          >
            {added ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
