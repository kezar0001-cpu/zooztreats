// Canonical money helper for Zooz Treats.
// Zooz Treats is a Montreal bakery: all prices are in Canadian dollars.
// Prices are stored in the database as integer cents (e.g. 1800 = CA$18.00).

export const STORE_CURRENCY = "CAD";
export const STORE_STRIPE_CURRENCY = "cad";
export const STORE_LOCALE = "en-CA";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(STORE_LOCALE, {
    style: "currency",
    currency: STORE_CURRENCY,
  }).format(cents / 100);
}
