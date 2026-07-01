"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CartItem,
  CartItemOptions,
  DiscountValidation,
  StoreProduct,
} from "@/types/store";
import type { FulfillmentMethod } from "@/lib/types";

const MAX_QTY = 99;

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
}

// Stable identity for a cart line. Two additions of the same product with
// different customization (ribbon, finish, or uploaded design) become separate
// lines; identical configurations merge.
function lineKey(productId: string, options?: CartItemOptions): string {
  if (!options) return productId;
  const parts = [
    options.ribbonColourId ?? "",
    options.finish ?? "",
    options.stickerUpload?.path ?? "",
  ];
  if (parts.every((p) => p === "")) return productId;
  return `${productId}|${parts.join("~")}`;
}

// The per-item options shape sent to the checkout API. The server re-derives the
// name and price from the database; it only needs the identifiers + upload refs.
export interface CheckoutItemInput {
  product_id: string;
  quantity: number;
  options?: CartItemOptions;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Applied discount (display-only; recalculated at checkout server-side).
  discountCode: string | null;
  discount: DiscountValidation | null;
  fulfillmentMethod: FulfillmentMethod;
  // Whether the customer opted into the paid expedite (rush) option.
  expedite: boolean;

  // UI
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setFulfillmentMethod: (method: FulfillmentMethod) => void;
  setExpedite: (value: boolean) => void;

  // Items
  addItem: (
    product: StoreProduct,
    quantity?: number,
    options?: CartItemOptions,
    optionsSurchargeCents?: number,
  ) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;

  // Discount
  setDiscount: (code: string | null, result: DiscountValidation | null) => void;
  clearDiscount: () => void;

  // Reconcile the persisted cart against the live product list: drop items that
  // are no longer active and refresh names/prices/images so we never trust
  // stale prices from localStorage. Customization options are preserved.
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
      expedite: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      setFulfillmentMethod: (method) => set({ fulfillmentMethod: method }),
      setExpedite: (value) => set({ expedite: value }),

      addItem: (product, quantity = 1, options, optionsSurchargeCents = 0) =>
        set((s) => {
          const key = lineKey(product.id, options);
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key
                  ? { ...i, quantity: clampQty(i.quantity + quantity) }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.price_cents,
            imageUrl: product.image_url,
            quantity: clampQty(quantity),
            boxType: product.box_type,
            options,
            optionsSurchargeCents,
          };
          return { items: [...s.items, item] };
        }),

      removeItem: (key) =>
        set((s) => ({
          items: s.items.filter((i) => i.key !== key),
        })),

      setQuantity: (key, quantity) =>
        set((s) => {
          if (quantity <= 0) {
            return { items: s.items.filter((i) => i.key !== key) };
          }
          return {
            items: s.items.map((i) =>
              i.key === key ? { ...i, quantity: clampQty(quantity) } : i,
            ),
          };
        }),

      clear: () =>
        set({ items: [], discount: null, discountCode: null, expedite: false }),

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
              key: i.key ?? lineKey(i.productId, i.options),
              slug: p.slug,
              name: p.name,
              priceCents: p.price_cents,
              imageUrl: p.image_url,
              boxType: p.box_type,
              optionsSurchargeCents: i.optionsSurchargeCents ?? 0,
            };
          });
        set({ items });
      },
    }),
    {
      name: "zooz-cart",
      version: 1,
      // Backfill fields added in v1 (line key, box type, option surcharge) for
      // carts persisted before this release so old items stay usable.
      migrate: (persisted: unknown) => {
        const state = persisted as
          | { items?: Partial<CartItem>[]; [k: string]: unknown }
          | null;
        if (state && Array.isArray(state.items)) {
          state.items = state.items.map((i) => ({
            ...i,
            key: i.key ?? i.productId ?? "",
            boxType: i.boxType ?? null,
            optionsSurchargeCents: i.optionsSurchargeCents ?? 0,
          })) as CartItem[];
        }
        return state as unknown as CartState;
      },
      // Persist line items + fulfillment/expedite choice; UI + discount are recomputed.
      partialize: (state) => ({
        items: state.items,
        fulfillmentMethod: state.fulfillmentMethod,
        expedite: state.expedite,
      }),
    },
  ),
);

// Selectors
export const selectItemCount = (s: CartState): number =>
  s.items.reduce((n, i) => n + i.quantity, 0);

// Subtotal includes each line's option surcharge (ribbon / seal / sticker).
export const selectSubtotalCents = (s: CartState): number =>
  s.items.reduce(
    (sum, i) => sum + (i.priceCents + (i.optionsSurchargeCents ?? 0)) * i.quantity,
    0,
  );

// Client helper: start checkout. Sends only product ids + quantities + chosen
// options (and the code/fulfillment/expedite choice). The server recalculates
// all prices and totals.
export async function requestCheckout(input: {
  items: CheckoutItemInput[];
  discount_code: string | null;
  fulfillment_method: FulfillmentMethod;
  expedite: boolean;
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
