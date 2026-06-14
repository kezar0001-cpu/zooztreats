"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { updateOrderStatus } from "@/app/admin/(protected)/orders/actions";
import { ADMIN_SETTABLE_ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import type { ActionResult } from "@/lib/types";

export function OrderStatusForm({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateOrderStatus,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <label htmlFor="order_status" className="admin-label">
        Order status
      </label>
      <div className="flex gap-2">
        <select
          id="order_status"
          name="order_status"
          defaultValue={
            ADMIN_SETTABLE_ORDER_STATUSES.includes(current)
              ? current
              : ADMIN_SETTABLE_ORDER_STATUSES[0]
          }
          className="admin-input"
        >
          {ADMIN_SETTABLE_ORDER_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <SubmitButton pendingText="Saving…">Update</SubmitButton>
      </div>

      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Updated."}</Alert>
      ) : null}
    </form>
  );
}
