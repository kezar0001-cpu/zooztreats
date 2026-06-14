"use client";

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  ariaLabel = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const btn =
    size === "sm"
      ? "h-8 w-8 text-base"
      : "h-10 w-10 text-lg";
  const box = size === "sm" ? "w-8 text-sm" : "w-10 text-base";

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="inline-flex items-center rounded-full border border-brand-200 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${btn} flex items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-cream-100 disabled:opacity-40`}
      >
        −
      </button>
      <span
        className={`${box} text-center font-semibold text-brand-900`}
        aria-label={ariaLabel}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`${btn} flex items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-cream-100 disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}
