import { Badge } from "@/components/admin/Badge";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

type BadgeColor = "green" | "gray" | "amber" | "blue" | "red";

const paymentColors: Record<PaymentStatus, BadgeColor> = {
  pending: "amber",
  paid: "green",
  failed: "red",
  refunded: "blue",
  cancelled: "gray",
};

const orderColors: Record<OrderStatus, BadgeColor> = {
  pending: "amber",
  paid: "blue",
  preparing: "amber",
  ready: "blue",
  completed: "green",
  cancelled: "gray",
  refunded: "red",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge color={paymentColors[status]}>{status}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge color={orderColors[status]}>{status}</Badge>;
}
