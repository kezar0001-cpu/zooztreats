"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { centsToDollarsString, toDatetimeLocalValue } from "@/lib/format";
import type { ActionResult, DiscountCode, DiscountType } from "@/lib/types";

type DiscountAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

export function DiscountForm({
  action,
  discount,
  submitLabel,
}: {
  action: DiscountAction;
  discount?: DiscountCode;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const [type, setType] = useState<DiscountType>(discount?.type ?? "percent");
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const valueDefault =
    discount == null
      ? ""
      : discount.type === "fixed"
        ? centsToDollarsString(discount.value)
        : String(discount.value);

  return (
    <form action={formAction} className="space-y-5">
      {discount ? <input type="hidden" name="id" value={discount.id} /> : null}

      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Saved."}</Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="admin-label">
            Code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            className="admin-input font-mono uppercase"
            placeholder="ZOOZ10"
            defaultValue={discount?.code ?? ""}
            required
          />
          <FieldError messages={errors?.code} />
        </div>

        <div>
          <label htmlFor="type" className="admin-label">
            Type
          </label>
          <select
            id="type"
            name="type"
            className="admin-input"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
          >
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed amount ($)</option>
            <option value="free_shipping">Free shipping</option>
          </select>
          <FieldError messages={errors?.type} />
        </div>
      </div>

      {type !== "free_shipping" ? (
        <div>
          <label htmlFor="value" className="admin-label">
            {type === "percent" ? "Percentage off" : "Amount off (USD)"}
          </label>
          <input
            id="value"
            name="value"
            type="text"
            inputMode="decimal"
            className="admin-input"
            placeholder={type === "percent" ? "10" : "5.00"}
            defaultValue={valueDefault}
            required
          />
          <FieldError messages={errors?.value} />
        </div>
      ) : (
        <input type="hidden" name="value" value="0" />
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="min_order" className="admin-label">
            Minimum order (USD)
          </label>
          <input
            id="min_order"
            name="min_order"
            type="text"
            inputMode="decimal"
            className="admin-input"
            placeholder="0.00"
            defaultValue={
              discount ? centsToDollarsString(discount.min_order_cents) : ""
            }
          />
          <FieldError messages={errors?.min_order_cents} />
        </div>

        <div>
          <label htmlFor="max_redemptions" className="admin-label">
            Max redemptions
          </label>
          <input
            id="max_redemptions"
            name="max_redemptions"
            type="number"
            min={0}
            className="admin-input"
            placeholder="Unlimited"
            defaultValue={discount?.max_redemptions ?? ""}
          />
          <FieldError messages={errors?.max_redemptions} />
        </div>
      </div>

      <div>
        <label htmlFor="expires_at" className="admin-label">
          Expires at
        </label>
        <input
          id="expires_at"
          name="expires_at"
          type="datetime-local"
          className="admin-input"
          defaultValue={toDatetimeLocalValue(discount?.expires_at ?? null)}
        />
        <p className="mt-1 text-xs text-gray-400">Leave blank for no expiry.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={discount ? discount.active : true}
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
        />
        Active
      </label>

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
