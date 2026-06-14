import { createClient } from "@/lib/supabase/server";
import type { DiscountCode } from "@/lib/types";
import type { DiscountValidation } from "@/types/store";
import { formatMoney } from "@/lib/money";

export async function getDiscounts(): Promise<DiscountCode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DiscountCode[];
}

export async function getDiscountById(
  id: string,
): Promise<DiscountCode | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as DiscountCode) ?? null;
}

// --- Public validation (server-side only) ----------------------------------

function invalid(message: string): DiscountValidation {
  return { valid: false, message, discount_cents: 0 };
}

// Computes the discount for a code against a subtotal. Runs server-side only
// (used by the validation API route and, in Phase 3, the checkout). The
// discount_codes table is never exposed to the browser: this looks up a single
// code via the SECURITY DEFINER `find_discount_code` function.
export async function validateDiscountCode(
  rawCode: string,
  subtotalCents: number,
): Promise<DiscountValidation> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return invalid("Enter a discount code.");
  if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
    return invalid("Invalid cart subtotal.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_discount_code", {
    p_code: code,
  });

  if (error) {
    return invalid("Could not validate this code right now.");
  }

  // The function returns a single row (or null).
  const discount = (Array.isArray(data) ? data[0] : data) as
    | DiscountCode
    | null;

  if (!discount) return invalid("That code doesn't exist.");
  if (!discount.active) return invalid("This code is no longer active.");

  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return invalid("This code has expired.");
  }

  if (
    discount.max_redemptions != null &&
    discount.redemption_count >= discount.max_redemptions
  ) {
    return invalid("This code has reached its redemption limit.");
  }

  if (subtotalCents < discount.min_order_cents) {
    return invalid(
      `Minimum order of ${formatMoney(discount.min_order_cents)} required for this code.`,
    );
  }

  let discountCents = 0;
  let message = "";

  switch (discount.type) {
    case "percent":
      discountCents = Math.round((subtotalCents * discount.value) / 100);
      message = `${discount.value}% off applied.`;
      break;
    case "fixed":
      discountCents = Math.min(discount.value, subtotalCents);
      message = `${formatMoney(discountCents)} off applied.`;
      break;
    case "free_shipping":
      discountCents = 0; // shipping is calculated at checkout (Phase 3)
      message = "Free shipping will be applied at checkout.";
      break;
  }

  discountCents = Math.min(discountCents, subtotalCents);

  return {
    valid: true,
    message,
    normalized_code: discount.code,
    discount_cents: discountCents,
    type: discount.type,
  };
}

export async function getDiscountCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("discount_codes")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}
