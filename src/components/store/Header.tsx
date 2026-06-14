"use client";

import { useEffect, useState } from "react";
import { useCart, selectItemCount } from "@/lib/cart";

const NAV = [
  { href: "#menu", label: "Menu" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const itemCount = useCart(selectItemCount);
  const openCart = useCart((s) => s.openCart);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: cart count comes from localStorage on the client.
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🍪
          </span>
          <span className="font-serif text-lg font-bold text-brand-800">
            Zooz Treats
          </span>
        </a>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-800/80 transition-colors hover:bg-cream-100 hover:text-brand-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={openCart}
          className="relative inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700"
          aria-label={`Open cart${mounted && itemCount > 0 ? `, ${itemCount} items` : ""}`}
        >
          <span aria-hidden>🛒</span>
          <span className="hidden sm:inline">Cart</span>
          {mounted && itemCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-brand-700">
              {itemCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}
