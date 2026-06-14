"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, DiscountValidation, StoreProduct } from "@/types/store";
import type { FulfillmentMethod } from "@/lib/types";

const MAX_QTY = 99;

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Applied discount (display-only; recalculated at checkout server-side).
  discountCode: string | null;
  discount: DiscountValidation | null;
  fulfillmentMethod: FulfillmentMethod;

  // UI
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setFulfillmentMethod: (method: FulfillmentMethod) => void;

  // Items
  addItem: (product: StoreProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;

  // Discount
  setDiscount: (code: string | null, result: DiscountValidation | null) => void;
  clearDiscount: () => void;

  // Reconcile the persisted cart against the live product list: drop items that
  // are no longer active and refresh names/prices/images so we never trust
  // stale prices from localStorage.
  reconcile: (activeProducts: StoreProduct[]) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      discountCode: null,
      discount: null,
      fulfillmentMethod: "shipping",

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      setFulfillmentMethod: (method) => set({ fulfillmentMethod: method }),

      addItem: (product, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: clampQty(i.quantity + quantity) }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.price_cents,
            imageUrl: product.image_url,
            quantity: clampQty(quantity),
          };
          return { items: [...s.items, item] };
        }),

      removeItem: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),

      setQuantity: (productId, quantity) =>
        set((s) => {
          if (quantity <= 0) {
            return { items: s.items.filter((i) => i.productId !== productId) };
          }
          return {
            items: s.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: clampQty(quantity) }
                : i,
            ),
          };
        }),

      clear: () => set({ items: [], discount: null, discountCode: null }),

      setDiscount: (code, result) =>
        set({ discountCode: code, discount: result }),
      clearDiscount: () => set({ discountCode: null, discount: null }),

      reconcile: (activeProducts) => {
        const byId = new Map(activeProducts.map((p) => [p.id, p]));
        const items = get()
          .items.filter((i) => byId.has(i.productId))
          .map((i) => {
            const p = byId.get(i.productId)!;
            return {
              ...i,
              slug: p.slug,
              name: p.name,
              priceCents: p.price_cents,
              imageUrl: p.image_url,
            };
          });
        set({ items });
      },
    }),
    {
      name: "zooz-cart",
      // Persist line items + fulfillment choice; UI + discount are recomputed.
      partialize: (state) => ({
        items: state.items,
        fulfillmentMethod: state.fulfillmentMethod,
      }),
    },
  ),
);

// Selectors
export const selectItemCount = (s: CartState): number =>
  s.items.reduce((n, i) => n + i.quantity, 0);

export const selectSubtotalCents = (s: CartState): number =>
  s.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

// Client helper: start checkout. Sends only product ids + quantities (and the
// code/fulfillment choice). The server recalculates all prices and totals.
export async function requestCheckout(input: {
  items: { product_id: string; quantity: number }[];
  discount_code: string | null;
  fulfillment_method: FulfillmentMethod;
}): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return { error: data.error ?? "Checkout failed. Please try again." };
    }
    return { url: data.url };
  } catch {
    return { error: "Checkout failed. Please check your connection." };
  }
}

// Client helper: ask the server to validate a discount code for a subtotal.
// The discount_codes table is never exposed to the browser — this hits the
// API route which computes everything server-side.
export async function requestDiscountValidation(
  code: string,
  subtotalCents: number,
): Promise<DiscountValidation> {
  try {
    const res = await fetch("/api/discount/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal_cents: subtotalCents }),
    });
    return (await res.json()) as DiscountValidation;
  } catch {
    return {
      valid: false,
      message: "Could not validate code. Please try again.",
      discount_cents: 0,
    };
  }
}
