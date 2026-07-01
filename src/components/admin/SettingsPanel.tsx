"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { centsToDollarsString } from "@/lib/format";
import {
  updateDeliverySettings,
  updateExpediteSettings,
  updateSocialSettings,
  updateBoxOptionSettings,
  updatePolicySettings,
  createRibbonColour,
  updateRibbonColour,
  deleteRibbonColour,
} from "@/app/admin/(protected)/settings/actions";
import { leadTimeLabel } from "@/lib/store-config";
import type { ActionResult, RibbonColour, Settings } from "@/lib/types";

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

function StatusAlert({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (!state.ok) return <Alert variant="error">{state.error}</Alert>;
  return <Alert variant="success">{state.message ?? "Saved."}</Alert>;
}

function DollarInput({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        $
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        className="admin-input pl-7"
        placeholder="0.00"
        defaultValue={defaultValue}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// --- Delivery --------------------------------------------------------------

function DeliveryForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateDeliverySettings,
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Section
      title="Delivery lead time"
      description="How long, on average, orders take before they are ready. Shown to customers at checkout."
    >
      <form action={action} className="space-y-4">
        <StatusAlert state={state} />
        <div className="max-w-xs">
          <label htmlFor="delivery_lead_time_days" className="admin-label">
            Lead time (days)
          </label>
          <input
            id="delivery_lead_time_days"
            name="delivery_lead_time_days"
            type="number"
            min={0}
            className="admin-input"
            defaultValue={settings.delivery_lead_time_days}
          />
          <p className="mt-1 text-xs text-gray-400">
            e.g. 14 = {leadTimeLabel(14)}, 7 = {leadTimeLabel(7)}, 3 ={" "}
            {leadTimeLabel(3)}.
          </p>
          <FieldError messages={errors?.delivery_lead_time_days} />
        </div>
        <SubmitButton>Save delivery time</SubmitButton>
      </form>
    </Section>
  );
}

// --- Expedite --------------------------------------------------------------

function ExpediteForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateExpediteSettings,
    null,
  );
  const [feeType, setFeeType] = useState(settings.expedite_fee_type);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Section
      title="Expedite (rush) option"
      description="Let customers pay extra to speed up their order."
    >
      <form action={action} className="space-y-4">
        <StatusAlert state={state} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="expedite_enabled"
            defaultChecked={settings.expedite_enabled}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
          />
          Offer expedited orders
        </label>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="expedite_fee_type" className="admin-label">
              Fee type
            </label>
            <select
              id="expedite_fee_type"
              name="expedite_fee_type"
              className="admin-input"
              value={feeType}
              onChange={(e) =>
                setFeeType(e.target.value as "fixed" | "percent")
              }
            >
              <option value="fixed">Fixed amount</option>
              <option value="percent">Percentage of order</option>
            </select>
          </div>
          <div>
            <label htmlFor="expedite_lead_time_days" className="admin-label">
              Rush lead time (days)
            </label>
            <input
              id="expedite_lead_time_days"
              name="expedite_lead_time_days"
              type="number"
              min={0}
              className="admin-input"
              defaultValue={settings.expedite_lead_time_days}
            />
            <FieldError messages={errors?.expedite_lead_time_days} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className={feeType === "fixed" ? "" : "opacity-50"}>
            <label htmlFor="expedite_fee" className="admin-label">
              Fixed fee (CAD)
            </label>
            <DollarInput
              id="expedite_fee"
              name="expedite_fee"
              defaultValue={centsToDollarsString(settings.expedite_fee_cents)}
            />
            <FieldError messages={errors?.expedite_fee_cents} />
          </div>
          <div className={feeType === "percent" ? "" : "opacity-50"}>
            <label htmlFor="expedite_fee_percent" className="admin-label">
              Percentage (%)
            </label>
            <input
              id="expedite_fee_percent"
              name="expedite_fee_percent"
              type="number"
              min={0}
              max={100}
              className="admin-input"
              defaultValue={settings.expedite_fee_percent}
            />
            <FieldError messages={errors?.expedite_fee_percent} />
          </div>
        </div>
        <SubmitButton>Save expedite options</SubmitButton>
      </form>
    </Section>
  );
}

// --- Box option pricing ----------------------------------------------------

function BoxPricingForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateBoxOptionSettings,
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Section
      title="Box option pricing"
      description="Extra charges for box finishes. Ribbon colours are priced individually below."
    >
      <form action={action} className="space-y-4">
        <StatusAlert state={state} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="party_sticker_surcharge" className="admin-label">
              Party sticker (CAD)
            </label>
            <DollarInput
              id="party_sticker_surcharge"
              name="party_sticker_surcharge"
              defaultValue={centsToDollarsString(
                settings.party_sticker_surcharge_cents,
              )}
            />
            <FieldError messages={errors?.party_sticker_surcharge_cents} />
          </div>
          <div>
            <label htmlFor="premium_wax_surcharge" className="admin-label">
              Premium wax seal (CAD)
            </label>
            <DollarInput
              id="premium_wax_surcharge"
              name="premium_wax_surcharge"
              defaultValue={centsToDollarsString(
                settings.premium_wax_surcharge_cents,
              )}
            />
            <FieldError messages={errors?.premium_wax_surcharge_cents} />
          </div>
          <div>
            <label htmlFor="premium_sticker_surcharge" className="admin-label">
              Premium sticker (CAD)
            </label>
            <DollarInput
              id="premium_sticker_surcharge"
              name="premium_sticker_surcharge"
              defaultValue={centsToDollarsString(
                settings.premium_sticker_surcharge_cents,
              )}
            />
            <FieldError messages={errors?.premium_sticker_surcharge_cents} />
          </div>
        </div>
        <SubmitButton>Save box pricing</SubmitButton>
      </form>
    </Section>
  );
}

// --- Social ----------------------------------------------------------------

function SocialForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateSocialSettings,
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const rows: {
    name: keyof Pick<
      Settings,
      "social_tiktok" | "social_instagram" | "social_youtube" | "social_x"
    >;
    label: string;
  }[] = [
    { name: "social_tiktok", label: "TikTok" },
    { name: "social_instagram", label: "Instagram" },
    { name: "social_youtube", label: "YouTube" },
    { name: "social_x", label: "X (Twitter)" },
  ];
  return (
    <Section
      title="Social media"
      description="Add a handle to show its icon in the footer. Leave blank to hide it."
    >
      <form action={action} className="space-y-4">
        <StatusAlert state={state} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.name}>
              <label htmlFor={r.name} className="admin-label">
                {r.label} handle
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  @
                </span>
                <input
                  id={r.name}
                  name={r.name}
                  type="text"
                  className="admin-input pl-7"
                  placeholder="zooztreats"
                  defaultValue={settings[r.name] ?? ""}
                />
              </div>
              <FieldError messages={errors?.[r.name]} />
            </div>
          ))}
        </div>
        <SubmitButton>Save social links</SubmitButton>
      </form>
    </Section>
  );
}

// --- Policies --------------------------------------------------------------

function PolicyForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updatePolicySettings,
    null,
  );
  const fields: {
    name: keyof Pick<
      Settings,
      "terms_content" | "privacy_content" | "refund_content"
    >;
    label: string;
  }[] = [
    { name: "terms_content", label: "Terms of Service" },
    { name: "privacy_content", label: "Privacy Policy" },
    { name: "refund_content", label: "Refund Policy" },
  ];
  return (
    <Section
      title="Legal pages"
      description="Edit the Terms, Privacy and Refund pages shown to customers."
    >
      <form action={action} className="space-y-4">
        <StatusAlert state={state} />
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="admin-label">
              {f.label}
            </label>
            <textarea
              id={f.name}
              name={f.name}
              rows={8}
              className="admin-input font-mono text-xs"
              defaultValue={settings[f.name] ?? ""}
            />
          </div>
        ))}
        <SubmitButton>Save policies</SubmitButton>
      </form>
    </Section>
  );
}

// --- Ribbon colours --------------------------------------------------------

function RibbonRow({ ribbon }: { ribbon: RibbonColour }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateRibbonColour,
    null,
  );
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={ribbon.id} />
        <span
          aria-hidden
          className="mb-1.5 h-8 w-8 shrink-0 rounded-full border border-gray-200"
          style={{ backgroundColor: ribbon.hex ?? "transparent" }}
        />
        <div className="min-w-[8rem] flex-1">
          <label className="admin-label text-xs">Name</label>
          <input
            name="name"
            className="admin-input"
            defaultValue={ribbon.name}
          />
        </div>
        <div className="w-28">
          <label className="admin-label text-xs">Hex</label>
          <input
            name="hex"
            className="admin-input font-mono"
            placeholder="#c0392b"
            defaultValue={ribbon.hex ?? ""}
          />
        </div>
        <div className="w-28">
          <label className="admin-label text-xs">Surcharge</label>
          <DollarInput
            id={`surcharge-${ribbon.id}`}
            name="surcharge"
            defaultValue={centsToDollarsString(ribbon.surcharge_cents)}
          />
        </div>
        <div className="w-20">
          <label className="admin-label text-xs">Order</label>
          <input
            name="sort_order"
            type="number"
            min={0}
            className="admin-input"
            defaultValue={ribbon.sort_order}
          />
        </div>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={ribbon.active}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
          />
          Active
        </label>
        <SubmitButton className="admin-btn-secondary !py-2">Save</SubmitButton>
      </form>
      <form action={deleteRibbonColour} className="mt-2 text-right">
        <input type="hidden" name="id" value={ribbon.id} />
        <SubmitButton
          className="text-xs text-red-600 underline"
          confirm={`Delete the "${ribbon.name}" ribbon colour?`}
          pendingText="Deleting…"
        >
          Delete
        </SubmitButton>
      </form>
      {state && !state.ok ? (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}

function AddRibbonForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    createRibbonColour,
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-gray-300 p-3"
    >
      <div className="min-w-[8rem] flex-1">
        <label className="admin-label text-xs">Name</label>
        <input name="name" className="admin-input" placeholder="Emerald" />
        <FieldError messages={errors?.name} />
      </div>
      <div className="w-28">
        <label className="admin-label text-xs">Hex</label>
        <input
          name="hex"
          className="admin-input font-mono"
          placeholder="#2ecc71"
        />
        <FieldError messages={errors?.hex} />
      </div>
      <div className="w-28">
        <label className="admin-label text-xs">Surcharge</label>
        <DollarInput id="surcharge-new" name="surcharge" defaultValue="" />
      </div>
      <div className="w-20">
        <label className="admin-label text-xs">Order</label>
        <input
          name="sort_order"
          type="number"
          min={0}
          className="admin-input"
          defaultValue={0}
        />
      </div>
      <label className="mb-2.5 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
        />
        Active
      </label>
      <SubmitButton className="admin-btn-primary !py-2">Add colour</SubmitButton>
    </form>
  );
}

function RibbonSection({ ribbons }: { ribbons: RibbonColour[] }) {
  return (
    <Section
      title="Ribbon colours"
      description="Colours customers can choose for party and premium boxes. Each can carry its own surcharge."
    >
      <div className="space-y-3">
        {ribbons.map((r) => (
          <RibbonRow key={r.id} ribbon={r} />
        ))}
        <AddRibbonForm />
      </div>
    </Section>
  );
}

// --- Panel -----------------------------------------------------------------

export function SettingsPanel({
  settings,
  ribbons,
}: {
  settings: Settings;
  ribbons: RibbonColour[];
}) {
  return (
    <div className="space-y-6">
      <DeliveryForm settings={settings} />
      <ExpediteForm settings={settings} />
      <BoxPricingForm settings={settings} />
      <RibbonSection ribbons={ribbons} />
      <SocialForm settings={settings} />
      <PolicyForm settings={settings} />
    </div>
  );
}
