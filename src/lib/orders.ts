import { createClient } from "@/lib/supabase/server";
import type { Order, OrderWithItems } from "@/lib/types";

// Admin reads run through the cookie-based client as the authenticated admin;
// RLS permits authenticated select/update on orders.

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const order = data as OrderWithItems;
  order.order_items = [...(order.order_items ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  return order;
}
