import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, SETTINGS_TAG, RIBBONS_TAG } from "@/lib/store-config";
import type { RibbonColour, Settings } from "@/lib/types";

const SETTINGS_COLUMNS =
  "delivery_lead_time_days, expedite_enabled, expedite_fee_type, expedite_fee_cents, " +
  "expedite_fee_percent, expedite_lead_time_days, party_sticker_surcharge_cents, " +
  "premium_wax_surcharge_cents, premium_sticker_surcharge_cents, social_tiktok, " +
  "social_instagram, social_youtube, social_x, terms_content, privacy_content, " +
  "refund_content, updated_at";

function normalizeSettings(row: Partial<Settings> | null): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...row };
}

// Cached public read of the single settings row. Falls back to defaults if the
// row is missing. Uses the cookieless public client so it is safe inside
// unstable_cache; admin mutations call revalidateTag(SETTINGS_TAG).
export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("settings")
        .select(SETTINGS_COLUMNS)
        .eq("id", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return normalizeSettings(data as Partial<Settings> | null);
    } catch (e) {
      // The footer + legal pages depend on this on every page. Degrade to
      // defaults (e.g. before the settings migration is applied) rather than
      // failing the whole page.
      console.error("[settings] read failed, using defaults:", (e as Error)?.message);
      return { ...DEFAULT_SETTINGS };
    }
  },
  ["site-settings"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);

// Cached public read of active ribbon colours (for the storefront configurator).
export const getRibbonColours = unstable_cache(
  async (): Promise<RibbonColour[]> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("ribbon_colours")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as RibbonColour[];
    } catch (e) {
      console.error("[ribbon_colours] read failed:", (e as Error)?.message);
      return [];
    }
  },
  ["ribbon-colours-active"],
  { tags: [RIBBONS_TAG], revalidate: 300 },
);

// Admin read of the raw settings row (authenticated client, uncached).
export async function getSettingsForAdmin(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select(SETTINGS_COLUMNS)
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeSettings(data as Partial<Settings> | null);
}

// Admin read of every ribbon colour, including inactive ones.
export async function getAllRibbonColours(): Promise<RibbonColour[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ribbon_colours")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RibbonColour[];
}
