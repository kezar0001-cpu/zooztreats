"use client";

import { useState } from "react";
import {
  useCart,
  selectSubtotalCents,
  requestDiscountValidation,
} from "@/lib/cart";

export function DiscountCodeInput() {
  const subtotal = useCart(selectSubtotalCents);
  const discount = useCart((s) => s.discount);
  const discountCode = useCart((s) => s.discountCode);
  const setDiscount = useCart((s) => s.setDiscount);
  const clearDiscount = useCart((s) => s.clearDiscount);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const applied = discount?.valid ? discount : null;

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    const result = await requestDiscountValidation(trimmed, subtotal);
    setDiscount(trimmed, result);
    setLoading(false);
    if (result.valid) setCode("");
  };

  const remove = () => {
    clearDiscount();
    setCode("");
  };

  // A code is applied and currently valid.
  if (applied) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-green-800">
              {applied.normalized_code ?? discountCode}
            </p>
            <p className="truncate text-xs text-green-700">{applied.message}</p>
          </div>
          <button
            type="button"
            onClick={remove}
            className="shrink-0 text-xs font-medium text-green-800 underline hover:text-green-900"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Discount code"
          className="block w-full rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-mono uppercase placeholder:font-sans placeholder:normal-case placeholder:text-brand-800/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          aria-label="Discount code"
        />
        <button
          type="button"
          onClick={apply}
          disabled={loading || code.trim() === ""}
          className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "…" : "Apply"}
        </button>
      </div>
      {discount && !discount.valid ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {discount.message}
        </p>
      ) : null}
    </div>
  );
}
