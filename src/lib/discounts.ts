import { createClient } from "@/lib/supabase/server";
import type { DiscountCode } from "@/lib/types";

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

export async function getDiscountCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("discount_codes")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}
