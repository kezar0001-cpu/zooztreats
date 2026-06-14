import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type Order, type OrderStatus, type OrderWithItems } from "@/lib/types";

// Admin reads run through the cookie-based client as the authenticated admin;
// RLS permits authenticated select/update on orders.

export const ORDERS_PAGE_SIZE = 20;

export interface OrderFilters {
  status?: OrderStatus | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface OrdersResult {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getOrders(
  filters: OrderFilters = {},
): Promise<OrdersResult> {
  const supabase = await createClient();

  const pageSize = filters.pageSize ?? ORDERS_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("order_status", filters.status);
  }

  const q = filters.q?.trim();
  if (q) {
    // Match on customer email/name or short order id.
    query = query.or(
      `customer_email.ilike.%${q}%,customer_name.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    orders: (data ?? []) as Order[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface OrderStats {
  paidRevenueCents: number;
  paidCount: number;
  pendingFulfilmentCount: number;
  ordersToday: number;
  byStatus: Record<OrderStatus, number>;
  recent: Order[];
}

// Dashboard metrics: revenue from paid orders, work-to-do counts, and a recent
// orders list. Kept to a few targeted queries.
export async function getOrderStats(): Promise<OrderStats> {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [paidRes, recentRes, todayRes, ...statusRes] = await Promise.all([
    supabase.from("orders").select("total_cents").eq("payment_status", "paid"),
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
    ...ORDER_STATUSES.map((s) =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("order_status", s),
    ),
  ]);

  if (paidRes.error) throw new Error(paidRes.error.message);

  const paidRows = (paidRes.data ?? []) as { total_cents: number }[];
  const paidRevenueCents = paidRows.reduce((s, r) => s + r.total_cents, 0);

  const byStatus = {} as Record<OrderStatus, number>;
  ORDER_STATUSES.forEach((s, i) => {
    byStatus[s] = statusRes[i]?.count ?? 0;
  });

  return {
    paidRevenueCents,
    paidCount: paidRows.length,
    pendingFulfilmentCount: byStatus.paid + byStatus.preparing,
    ordersToday: todayRes.count ?? 0,
    byStatus,
    recent: (recentRes.data ?? []) as Order[],
  };
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
