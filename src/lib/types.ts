// Shared domain types for Zooz Treats.

export type DiscountType = "percent" | "fixed" | "free_shipping";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string | null;
  active: boolean;
  featured: boolean;
  sort_order: number;
  prep_time_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
}

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  active: boolean;
  min_order_cents: number;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  stripe_coupon_id: string | null;
  created_at: string;
  updated_at: string;
}

// Standard return shape for server actions, used to drive UI success/error states.
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// --- Orders ----------------------------------------------------------------

export type FulfillmentMethod = "shipping" | "pickup";

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Statuses an admin may set manually (subset of ORDER_STATUSES).
export const ADMIN_SETTABLE_ORDER_STATUSES: OrderStatus[] = [
  "paid",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "refunded",
];

export interface Order {
  id: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  phone: string | null;
  fulfillment_method: FulfillmentMethod;
  shipping_name: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  subtotal_cents: number;
  discount_code: string | null;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  discount_redemption_recorded: boolean;
  confirmation_email_sent: boolean;
  order_token: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}
