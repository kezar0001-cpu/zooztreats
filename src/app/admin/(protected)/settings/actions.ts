"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS_TAG, RIBBONS_TAG } from "@/lib/store-config";
import {
  dollarsToCents,
  deliverySettingsSchema,
  expediteSettingsSchema,
  socialSettingsSchema,
  boxOptionSettingsSchema,
  policySettingsSchema,
  ribbonColourSchema,
} from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

function checkbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

function fieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

// Applies a partial update to the single settings row (id = true), refreshing
// every cached read that depends on it (footer, legal pages, product pages,
// cart config). Uses upsert so a missing row is created with defaults.
async function saveSettings(
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ id: true, ...patch }, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidateTag(SETTINGS_TAG);
  revalidatePath("/admin/settings");
  // Footer + legal pages live under the root layout.
  revalidatePath("/", "layout");
  return {};
}

// --- Delivery lead time ----------------------------------------------------

export async function updateDeliverySettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = deliverySettingsSchema.safeParse({
    delivery_lead_time_days: Number(formData.get("delivery_lead_time_days") ?? NaN),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { error } = await saveSettings(parsed.data);
  if (error) return { ok: false, error };
  return { ok: true, data: undefined, message: "Delivery time saved." };
}

// --- Expedite --------------------------------------------------------------

export async function updateExpediteSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = expediteSettingsSchema.safeParse({
    expedite_enabled: checkbox(formData.get("expedite_enabled")),
    expedite_fee_type:
      String(formData.get("expedite_fee_type") ?? "fixed") === "percent"
        ? "percent"
        : "fixed",
    expedite_fee_cents: dollarsToCents(String(formData.get("expedite_fee") ?? "")) ?? 0,
    expedite_fee_percent: Number(formData.get("expedite_fee_percent") ?? 0) || 0,
    expedite_lead_time_days: Number(formData.get("expedite_lead_time_days") ?? NaN),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { error } = await saveSettings(parsed.data);
  if (error) return { ok: false, error };
  return { ok: true, data: undefined, message: "Expedite options saved." };
}

// --- Social handles --------------------------------------------------------

export async function updateSocialSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = socialSettingsSchema.safeParse({
    social_tiktok: String(formData.get("social_tiktok") ?? ""),
    social_instagram: String(formData.get("social_instagram") ?? ""),
    social_youtube: String(formData.get("social_youtube") ?? ""),
    social_x: String(formData.get("social_x") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const clean = (v: string | undefined) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t.replace(/^@+/, "");
  };

  const { error } = await saveSettings({
    social_tiktok: clean(parsed.data.social_tiktok),
    social_instagram: clean(parsed.data.social_instagram),
    social_youtube: clean(parsed.data.social_youtube),
    social_x: clean(parsed.data.social_x),
  });
  if (error) return { ok: false, error };
  return { ok: true, data: undefined, message: "Social links saved." };
}

// --- Box option surcharges -------------------------------------------------

export async function updateBoxOptionSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = boxOptionSettingsSchema.safeParse({
    party_sticker_surcharge_cents:
      dollarsToCents(String(formData.get("party_sticker_surcharge") ?? "")) ?? 0,
    premium_wax_surcharge_cents:
      dollarsToCents(String(formData.get("premium_wax_surcharge") ?? "")) ?? 0,
    premium_sticker_surcharge_cents:
      dollarsToCents(String(formData.get("premium_sticker_surcharge") ?? "")) ?? 0,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { error } = await saveSettings(parsed.data);
  if (error) return { ok: false, error };
  return { ok: true, data: undefined, message: "Box option pricing saved." };
}

// --- Legal policies --------------------------------------------------------

export async function updatePolicySettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = policySettingsSchema.safeParse({
    terms_content: String(formData.get("terms_content") ?? ""),
    privacy_content: String(formData.get("privacy_content") ?? ""),
    refund_content: String(formData.get("refund_content") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { error } = await saveSettings({
    terms_content: parsed.data.terms_content || null,
    privacy_content: parsed.data.privacy_content || null,
    refund_content: parsed.data.refund_content || null,
  });
  if (error) return { ok: false, error };
  return { ok: true, data: undefined, message: "Policies saved." };
}

// --- Ribbon colours (CRUD) -------------------------------------------------

function parseRibbon(formData: FormData) {
  return ribbonColourSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    hex: String(formData.get("hex") ?? ""),
    surcharge_cents: dollarsToCents(String(formData.get("surcharge") ?? "")) ?? 0,
    active: checkbox(formData.get("active")),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });
}

async function refreshRibbons() {
  revalidateTag(RIBBONS_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}

export async function createRibbonColour(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = parseRibbon(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("ribbon_colours").insert({
    name: v.name,
    hex: v.hex || null,
    surcharge_cents: v.surcharge_cents,
    active: v.active,
    sort_order: v.sort_order,
  });
  if (error) return { ok: false, error: error.message };

  await refreshRibbons();
  return { ok: true, data: undefined, message: "Ribbon colour added." };
}

export async function updateRibbonColour(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing ribbon id." };

  const parsed = parseRibbon(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("ribbon_colours")
    .update({
      name: v.name,
      hex: v.hex || null,
      surcharge_cents: v.surcharge_cents,
      active: v.active,
      sort_order: v.sort_order,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await refreshRibbons();
  return { ok: true, data: undefined, message: "Ribbon colour saved." };
}

export async function deleteRibbonColour(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("ribbon_colours").delete().eq("id", id);
  await refreshRibbons();
}
