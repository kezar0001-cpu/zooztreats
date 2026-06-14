"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_SETTABLE_ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

export async function updateOrderStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("order_status") ?? "") as OrderStatus;

  if (!id) return { ok: false, error: "Missing order id." };
  if (!ADMIN_SETTABLE_ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid order status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ order_status: status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { ok: true, data: undefined, message: `Order marked ${status}.` };
}
