// Client-safe store configuration helpers and constants.
// Pure functions + defaults only — NO server-only imports, so this can be used
// from both the cart UI (client) and the checkout/pricing code (server).

import type { Settings } from "@/lib/types";

// Cache tags. Admin mutations call revalidateTag() with these to refresh the
// cached public reads immediately (mirrors PRODUCTS_TAG in @/lib/products).
export const SETTINGS_TAG = "settings";
export const RIBBONS_TAG = "ribbon-colours";

// Sensible defaults used when the settings row is missing or a value is null.
export const DEFAULT_SETTINGS: Settings = {
  delivery_lead_time_days: 14,
  expedite_enabled: false,
  expedite_fee_type: "fixed",
  expedite_fee_cents: 0,
  expedite_fee_percent: 0,
  expedite_lead_time_days: 3,
  party_sticker_surcharge_cents: 0,
  premium_wax_surcharge_cents: 0,
  premium_sticker_surcharge_cents: 0,
  social_tiktok: null,
  social_instagram: null,
  social_youtube: null,
  social_x: null,
  terms_content: null,
  privacy_content: null,
  refund_content: null,
};

// The subset of settings the cart needs to render the expedite toggle and the
// lead-time estimate. Returned by GET /api/store-settings.
export interface PublicStoreConfig {
  delivery_lead_time_days: number;
  expedite_enabled: boolean;
  expedite_fee_type: Settings["expedite_fee_type"];
  expedite_fee_cents: number;
  expedite_fee_percent: number;
  expedite_lead_time_days: number;
}

export function toPublicStoreConfig(s: Settings): PublicStoreConfig {
  return {
    delivery_lead_time_days: s.delivery_lead_time_days,
    expedite_enabled: s.expedite_enabled,
    expedite_fee_type: s.expedite_fee_type,
    expedite_fee_cents: s.expedite_fee_cents,
    expedite_fee_percent: s.expedite_fee_percent,
    expedite_lead_time_days: s.expedite_lead_time_days,
  };
}

// The expedite surcharge in cents for a given subtotal. Fixed amount or a
// percentage of the subtotal, depending on admin configuration. 0 when expedite
// is disabled. This is the single source of truth used by both the cart
// (display) and the checkout API (authoritative).
export function computeExpediteCents(
  config: PublicStoreConfig,
  subtotalCents: number,
): number {
  if (!config.expedite_enabled) return 0;
  if (config.expedite_fee_type === "percent") {
    return Math.max(0, Math.round((subtotalCents * config.expedite_fee_percent) / 100));
  }
  return Math.max(0, config.expedite_fee_cents);
}

// The promised lead time in days for an order (rush vs standard).
export function effectiveLeadTimeDays(
  config: PublicStoreConfig,
  expedite: boolean,
): number {
  return expedite && config.expedite_enabled
    ? config.expedite_lead_time_days
    : config.delivery_lead_time_days;
}

// Human-friendly lead-time label, e.g. "about 2 weeks", "about 1 week",
// "a few days", "3 days".
export function leadTimeLabel(days: number): string {
  if (days <= 0) return "same day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? "about 1 week" : `about ${weeks} weeks`;
  }
  return `about ${days} days`;
}

// Builds a public profile URL for a social handle. Returns null if no handle.
export function socialUrl(
  platform: "tiktok" | "instagram" | "youtube" | "x",
  handle: string | null | undefined,
): string | null {
  const h = (handle ?? "").trim().replace(/^@+/, "");
  if (!h) return null;
  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "instagram":
      return `https://www.instagram.com/${h}`;
    case "youtube":
      return `https://www.youtube.com/@${h}`;
    case "x":
      return `https://x.com/${h}`;
  }
}
