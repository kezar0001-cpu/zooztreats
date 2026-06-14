"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

// Clears the cart once the order has been placed (rendered on the success page).
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
