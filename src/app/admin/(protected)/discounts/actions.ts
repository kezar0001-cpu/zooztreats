"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { discountSchema, dollarsToCents } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

function checkbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

function parseDiscountForm(formData: FormData) {
  const type = String(formData.get("type") ?? "");

  // value meaning depends on type:
  //  - percent: whole-number percentage
  //  - fixed: dollar amount → cents
  //  - free_shipping: ignored (0)
  const rawValue = String(formData.get("value") ?? "");
  let value = 0;
  if (type === "fixed") {
    value = dollarsToCents(rawValue) ?? NaN;
  } else if (type === "percent") {
    value = Number(rawValue);
  }

  const maxRedRaw = String(formData.get("max_redemptions") ?? "").trim();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();

  return discountSchema.safeParse({
    code: String(formData.get("code") ?? "").toUpperCase(),
    type,
    value: Number.isFinite(value) ? value : NaN,
    active: checkbox(formData.get("active")),
    min_order_cents: dollarsToCents(String(formData.get("min_order") ?? "0")) ?? 0,
    max_redemptions: maxRedRaw === "" ? null : Number(maxRedRaw),
    expires_at: expiresRaw === "" ? null : new Date(expiresRaw).toISOString(),
  });
}

export async function createDiscount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = parseDiscountForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("discount_codes").insert({
    code: v.code,
    type: v.type,
    value: v.value,
    active: v.active,
    min_order_cents: v.min_order_cents,
    max_redemptions: v.max_redemptions ?? null,
    expires_at: v.expires_at ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That code already exists.",
        fieldErrors: { code: ["Code must be unique."] },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/discounts");
  revalidatePath("/admin");
  return { ok: true, data: undefined, message: `Created code ${v.code}.` };
}

export async function updateDiscount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing discount id." };

  const parsed = parseDiscountForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("discount_codes")
    .update({
      code: v.code,
      type: v.type,
      value: v.value,
      active: v.active,
      min_order_cents: v.min_order_cents,
      max_redemptions: v.max_redemptions ?? null,
      expires_at: v.expires_at ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That code already exists.",
        fieldErrors: { code: ["Code must be unique."] },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/discounts");
  revalidatePath("/admin");
  return { ok: true, data: undefined, message: `Saved code ${v.code}.` };
}

export async function toggleDiscountActive(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const next = checkbox(formData.get("active"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("discount_codes").update({ active: next }).eq("id", id);

  revalidatePath("/admin/discounts");
  revalidatePath("/admin");
}

export async function deleteDiscount(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("discount_codes").delete().eq("id", id);

  revalidatePath("/admin/discounts");
  revalidatePath("/admin");
}
