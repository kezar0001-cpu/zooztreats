"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCart,
  selectSubtotalCents,
  selectItemCount,
  requestDiscountValidation,
  requestCheckout,
} from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import {
  computeShippingCents,
  FLAT_SHIPPING_CENTS,
  SHIPPING_ENABLED,
  LOCAL_PICKUP_ENABLED,
} from "@/lib/fulfillment";
import {
  computeExpediteCents,
  effectiveLeadTimeDays,
  leadTimeLabel,
  type PublicStoreConfig,
} from "@/lib/store-config";
import { ProductImage } from "./ProductImage";
import { QuantitySelector } from "./QuantitySelector";
import { DiscountCodeInput } from "./DiscountCodeInput";
import type { FulfillmentMethod } from "@/lib/types";
import type { CartItem } from "@/types/store";

// Short, human-readable summary of a line's chosen options (ribbon / finish).
function optionLines(item: CartItem): string[] {
  const lines: string[] = [];
  if (item.options?.ribbonColourName) {
    lines.push(`Ribbon: ${item.options.ribbonColourName}`);
  }
  if (item.options?.finish) {
    lines.push(
      item.options.finish === "wax" ? "Finish: Wax seal" : "Finish: Custom sticker",
    );
  }
  return lines;
}

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const subtotal = useCart(selectSubtotalCents);
  const itemCount = useCart(selectItemCount);
  const discount = useCart((s) => s.discount);
  const discountCode = useCart((s) => s.discountCode);
  const setDiscount = useCart((s) => s.setDiscount);
  const clearDiscount = useCart((s) => s.clearDiscount);
  const fulfillmentMethod = useCart((s) => s.fulfillmentMethod);
  const setFulfillmentMethod = useCart((s) => s.setFulfillmentMethod);
  const expedite = useCart((s) => s.expedite);
  const setExpedite = useCart((s) => s.setExpedite);

  const [mounted, setMounted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicStoreConfig | null>(null);

  const drawerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Load public store config (lead time + expedite) once for the cart UI.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/store-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicStoreConfig | null) => {
        if (!cancelled && data) setConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape + trap Tab focus within the drawer while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCart();
        return;
      }
      if (e.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  // Move focus into the drawer on open; restore it to the trigger on close.
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      previouslyFocused.current =
        (document.activeElement as HTMLElement) ?? null;
      // Defer so the drawer has transitioned into view and is focusable.
      const id = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    previouslyFocused.current?.focus?.();
  }, [isOpen, mounted]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, mounted]);

  // Re-validate an applied discount whenever the subtotal changes. Debounced so
  // rapid quantity changes collapse into a single request; any in-flight result
  // is ignored once a newer change arrives.
  useEffect(() => {
    if (!discountCode) return;
    if (items.length === 0) {
      clearDiscount();
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      requestDiscountValidation(discountCode, subtotal).then((result) => {
        if (!cancelled) setDiscount(discountCode, result);
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, discountCode]);

  const validDiscount = discount?.valid ? discount : null;
  const discountCents = validDiscount ? validDiscount.discount_cents : 0;
  const shippingCents = computeShippingCents(
    fulfillmentMethod,
    validDiscount?.type ?? null,
  );

  const expediteAvailable = Boolean(config?.expedite_enabled);
  const expediteSelected = expedite && expediteAvailable;
  const expediteCents =
    config && expediteSelected ? computeExpediteCents(config, subtotal) : 0;

  const total = Math.max(
    0,
    subtotal - discountCents + shippingCents + expediteCents,
  );

  const leadTimeText = config
    ? leadTimeLabel(effectiveLeadTimeDays(config, expediteSelected))
    : null;

  const freeShippingOnPickup =
    validDiscount?.type === "free_shipping" && fulfillmentMethod === "pickup";

  const handleCheckout = async () => {
    if (items.length === 0 || checkoutLoading) return;
    setCheckoutError(null);
    setCheckoutLoading(true);
    const result = await requestCheckout({
      items: items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        options: i.options,
      })),
      discount_code: validDiscount
        ? (validDiscount.normalized_code ?? discountCode)
        : null,
      fulfillment_method: fulfillmentMethod,
      expedite: expediteSelected,
    });
    if (result.url) {
      // Redirect to Stripe Checkout. Cart is cleared on the success page only.
      window.location.href = result.url;
      return;
    }
    setCheckoutError(result.error ?? "Checkout failed. Please try again.");
    setCheckoutLoading(false);
  };

  const fulfillmentOptions: { value: FulfillmentMethod; label: string; note: string; enabled: boolean }[] =
    [
      {
        value: "shipping",
        label: "Ship within Canada",
        note: formatMoney(FLAT_SHIPPING_CENTS),
        enabled: SHIPPING_ENABLED,
      },
      {
        value: "pickup",
        label: "Local pickup in Montreal",
        note: "Free",
        enabled: LOCAL_PICKUP_ENABLED,
      },
    ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        aria-hidden
        className={`fixed inset-0 z-40 bg-brand-900/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream-50 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-300 px-5 py-4">
          <h2 className="font-serif text-xl font-bold text-brand-900">
            Your Cart{mounted && itemCount > 0 ? ` (${itemCount})` : ""}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-cream-200"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!mounted ? null : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl" aria-hidden>
                🛒
              </span>
              <p className="mt-3 font-medium text-brand-900">
                Your cart is empty
              </p>
              <p className="mt-1 text-sm text-brand-800/70">
                Add some treats to get started.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="store-btn-secondary mt-5 !px-5 !py-2 text-sm"
              >
                Browse the menu
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const unitCents = item.priceCents + (item.optionsSurchargeCents ?? 0);
                const opts = optionLines(item);
                return (
                  <li key={item.key} className="flex gap-3">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-2xl"
                      sizes="80px"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-brand-900">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.name}`}
                          className="shrink-0 text-xs text-brand-700/60 underline hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {opts.length > 0 ? (
                        <ul className="mt-0.5 text-xs text-brand-800/60">
                          {opts.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      ) : null}
                      {item.options?.stickerUpload ? (
                        <a
                          href={item.options.stickerUpload.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block text-xs text-brand-700 underline"
                        >
                          View sticker design
                        </a>
                      ) : null}
                      <p className="mt-1 text-sm text-brand-800/70">
                        {formatMoney(unitCents)} each
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <QuantitySelector
                          value={item.quantity}
                          onChange={(q) => setQuantity(item.key, q)}
                          size="sm"
                        />
                        <span className="font-semibold text-brand-900">
                          {formatMoney(unitCents * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Summary */}
        {mounted && items.length > 0 ? (
          <div className="space-y-4 border-t border-cream-300 bg-white px-5 py-5">
            {/* Fulfillment method */}
            <div>
              <p className="mb-2 text-sm font-medium text-brand-900">
                Delivery method
              </p>
              <div className="grid grid-cols-2 gap-2">
                {fulfillmentOptions
                  .filter((o) => o.enabled)
                  .map((opt) => {
                    const active = fulfillmentMethod === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFulfillmentMethod(opt.value)}
                        aria-pressed={active}
                        className={`rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "border-brand-500 bg-cream-100 ring-1 ring-brand-400"
                            : "border-cream-300 bg-white hover:bg-cream-50"
                        }`}
                      >
                        <span className="block font-medium text-brand-900">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-brand-800/60">
                          {opt.note}
                        </span>
                      </button>
                    );
                  })}
              </div>
              {freeShippingOnPickup ? (
                <p className="mt-2 text-xs text-green-700">
                  Your code makes shipping free — but pickup is already free!
                </p>
              ) : null}
              {leadTimeText ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-700/80">
                  <span aria-hidden>⏱️</span>
                  Estimated ready {leadTimeText}
                </p>
              ) : null}
            </div>

            {/* Expedite */}
            {expediteAvailable ? (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-cream-300 bg-white px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={expedite}
                  onChange={(e) => setExpedite(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                />
                <span className="text-sm">
                  <span className="font-medium text-brand-900">
                    Expedite my order
                  </span>
                  <span className="block text-xs text-brand-800/60">
                    {config
                      ? `Ready in ${leadTimeLabel(config.expedite_lead_time_days)}` +
                        (config.expedite_fee_type === "percent"
                          ? ` · +${config.expedite_fee_percent}%`
                          : ` · +${formatMoney(config.expedite_fee_cents)}`)
                      : null}
                  </span>
                </span>
              </label>
            ) : null}

            <DiscountCodeInput />

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-brand-800/80">
                <dt>Subtotal</dt>
                <dd>{formatMoney(subtotal)}</dd>
              </div>
              {discountCents > 0 ? (
                <div className="flex justify-between text-green-700">
                  <dt>Discount</dt>
                  <dd>−{formatMoney(discountCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-brand-800/80">
                <dt>
                  {fulfillmentMethod === "pickup" ? "Pickup" : "Shipping"}
                </dt>
                <dd>
                  {shippingCents === 0 ? "Free" : formatMoney(shippingCents)}
                </dd>
              </div>
              {expediteCents > 0 ? (
                <div className="flex justify-between text-brand-800/80">
                  <dt>Expedite</dt>
                  <dd>{formatMoney(expediteCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold text-brand-900">
                <dt>Estimated total</dt>
                <dd>{formatMoney(total)}</dd>
              </div>
            </dl>

            {checkoutError ? (
              <p className="text-sm text-red-600" role="alert">
                {checkoutError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="store-btn-primary w-full"
            >
              {checkoutLoading ? "Starting checkout…" : "Checkout"}
            </button>
            <p className="text-center text-xs text-brand-800/60">
              🔒 Secure payment with Stripe · prices in CAD
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
