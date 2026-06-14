"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { refundOrder } from "@/app/admin/(protected)/orders/actions";
import type { ActionResult } from "@/lib/types";

export function RefundButton({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    refundOrder,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <SubmitButton
        className="admin-btn-danger w-full"
        pendingText="Refunding…"
        confirm="Refund this order in full via Stripe? This cannot be undone."
      >
        Refund order
      </SubmitButton>
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Refunded."}</Alert>
      ) : null}
    </form>
  );
}
