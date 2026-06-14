"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

// Handles Stripe's cancel_url return (/?checkout=cancelled): shows a dismissible
// banner, re-opens the cart (which is preserved — it only clears on success),
// and strips the param from the URL. Reads location directly to avoid a
// Suspense boundary for useSearchParams.
export function CheckoutCancelledNotice() {
  const openCart = useCart((s) => s.openCart);
  const hasItems = useCart((s) => s.items.length > 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "cancelled") return;

    setVisible(true);
    if (hasItems) openCart();

    // Clean the param so a refresh doesn't re-trigger the banner.
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
  }, [openCart, hasItems]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-3">
      <div
        role="status"
        className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-caramel-300 bg-blush-50 px-4 py-3 shadow-soft"
      >
        <span aria-hidden className="text-lg">
          🛒
        </span>
        <div className="flex-1 text-sm text-brand-900">
          <p className="font-semibold">Checkout cancelled</p>
          <p className="text-brand-800/80">
            No worries — your cart is saved and ready when you are.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full px-2 text-brand-800/50 hover:text-brand-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
