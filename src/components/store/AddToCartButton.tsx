"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { QuantitySelector } from "./QuantitySelector";
import type { StoreProduct } from "@/types/store";

// Quantity selector + add-to-cart used on the product detail page.
export function AddToCartButton({ product }: { product: StoreProduct }) {
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
    <div className="flex items-center gap-3">
      <QuantitySelector value={qty} onChange={setQty} ariaLabel="Quantity" />
      <button
        type="button"
        onClick={handleAdd}
        className="store-btn-primary !px-6 !py-3"
      >
        {added ? "Added ✓" : "Add to Cart"}
      </button>
    </div>
  );
}
