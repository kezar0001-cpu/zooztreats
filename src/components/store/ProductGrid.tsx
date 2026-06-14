"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { ProductCard } from "./ProductCard";
import type { StoreProduct } from "@/types/store";

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  const reconcile = useCart((s) => s.reconcile);

  // Reconcile the persisted cart against the live product list: drop items that
  // are no longer active and refresh prices/names/images.
  useEffect(() => {
    reconcile(products);
  }, [products, reconcile]);

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-cream-300 bg-white/60 p-12 text-center">
        <p className="text-4xl" aria-hidden>
          🍪
        </p>
        <h3 className="mt-4 font-serif text-xl font-semibold text-brand-900">
          Our menu is being freshly baked
        </h3>
        <p className="mt-2 text-sm text-brand-800/70">
          New treats are coming soon. Check back shortly!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
