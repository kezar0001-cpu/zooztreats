"use client";

import { useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { formatMoney } from "@/lib/money";
import { QuantitySelector } from "./QuantitySelector";
import type {
  CartItemOptions,
  StickerUpload,
  StoreProduct,
} from "@/types/store";
import type { RibbonColour } from "@/lib/types";

export interface BoxSurcharges {
  partySticker: number;
  premiumWax: number;
  premiumSticker: number;
}

// Configurator shown on party / premium product pages. Lets the customer pick a
// ribbon colour, choose a premium finish (wax seal vs custom sticker), and
// upload a sticker design where required, then adds a fully-configured line to
// the cart. Prices shown here are for display; the checkout API re-derives them.
export function BoxConfigurator({
  product,
  ribbonColours,
  surcharges,
}: {
  product: StoreProduct;
  ribbonColours: RibbonColour[];
  surcharges: BoxSurcharges;
}) {
  const isPremium = product.box_type === "premium";
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const [qty, setQty] = useState(1);
  const [ribbonId, setRibbonId] = useState<string>(ribbonColours[0]?.id ?? "");
  const [finish, setFinish] = useState<"wax" | "sticker">("wax");
  const [sticker, setSticker] = useState<StickerUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // A sticker upload is required for every party box, and for a premium box only
  // when the customer picks the custom-sticker finish (not the wax seal).
  const stickerRequired = !isPremium || finish === "sticker";

  const selectedRibbon = ribbonColours.find((r) => r.id === ribbonId) ?? null;

  const finishSurcharge = isPremium
    ? finish === "wax"
      ? surcharges.premiumWax
      : surcharges.premiumSticker
    : surcharges.partySticker;

  const surchargeCents = (selectedRibbon?.surcharge_cents ?? 0) + finishSurcharge;
  const unitCents = product.price_cents + surchargeCents;

  const canAdd = useMemo(() => {
    if (uploading) return false;
    // A ribbon colour is required for both box types.
    if (ribbonColours.length === 0 || !selectedRibbon) return false;
    if (stickerRequired && !sticker) return false;
    return true;
  }, [ribbonColours.length, selectedRibbon, stickerRequired, sticker, uploading]);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/customization/upload", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        url?: string;
        path?: string;
        error?: string;
      };
      if (!res.ok || !data.url || !data.path) {
        setError(data.error ?? "Upload failed. Please try again.");
        return;
      }
      setSticker({ url: data.url, path: data.path });
    } catch {
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleAdd() {
    if (stickerRequired && !sticker) {
      setError("Please upload your sticker design first.");
      return;
    }
    if (ribbonColours.length > 0 && !selectedRibbon) {
      setError("Please choose a ribbon colour.");
      return;
    }

    const options: CartItemOptions = {};
    if (selectedRibbon) {
      options.ribbonColourId = selectedRibbon.id;
      options.ribbonColourName = selectedRibbon.name;
    }
    if (isPremium) options.finish = finish;
    if (sticker) options.stickerUpload = sticker;

    addItem(product, qty, options, surchargeCents);
    toast(`${product.name} added to cart`);
    setAdded(true);
    setSticker(null);
    if (fileRef.current) fileRef.current.value = "";
    openCart();
    window.setTimeout(() => setAdded(false), 1500);
  }

  const ribbonLabel = (r: RibbonColour) =>
    r.surcharge_cents > 0 ? `${r.name} (+${formatMoney(r.surcharge_cents)})` : r.name;

  return (
    <div className="space-y-5">
      {/* Packaging note */}
      <div className="rounded-2xl border border-cream-300 bg-white p-4 text-sm text-brand-800/80">
        {isPremium ? (
          <p>
            <span className="font-semibold text-brand-900">Premium box:</span> your
            cookies arrive in a clear box finished with a ribbon and your choice of a
            wax seal or a custom sticker.
          </p>
        ) : (
          <p>
            <span className="font-semibold text-brand-900">Party box:</span> your
            cookies are wrapped in a clear bag tied with a ribbon and finished with a
            round custom sticker.
          </p>
        )}
      </div>

      {/* Ribbon colour */}
      {ribbonColours.length > 0 ? (
        <div>
          <label htmlFor="ribbon" className="mb-1.5 block text-sm font-medium text-brand-900">
            Ribbon colour
          </label>
          <div className="flex items-center gap-3">
            {selectedRibbon?.hex ? (
              <span
                aria-hidden
                className="h-6 w-6 shrink-0 rounded-full border border-cream-300"
                style={{ backgroundColor: selectedRibbon.hex }}
              />
            ) : null}
            <select
              id="ribbon"
              value={ribbonId}
              onChange={(e) => setRibbonId(e.target.value)}
              className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm text-brand-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              {ribbonColours.map((r) => (
                <option key={r.id} value={r.id}>
                  {ribbonLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <p className="text-sm text-brand-800/70">
          Ribbon colours are being set up — please check back soon.
        </p>
      )}

      {/* Premium finish */}
      {isPremium ? (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-brand-900">
            Finish
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "wax", label: "Wax / hot seal", extra: surcharges.premiumWax },
                { value: "sticker", label: "Custom sticker", extra: surcharges.premiumSticker },
              ] as const
            ).map((opt) => {
              const active = finish === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFinish(opt.value)}
                  aria-pressed={active}
                  className={`rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? "border-brand-500 bg-cream-100 ring-1 ring-brand-400"
                      : "border-cream-300 bg-white hover:bg-cream-50"
                  }`}
                >
                  <span className="block font-medium text-brand-900">{opt.label}</span>
                  <span className="block text-xs text-brand-800/60">
                    {opt.extra > 0 ? `+${formatMoney(opt.extra)}` : "Included"}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {/* Sticker design upload */}
      {stickerRequired ? (
        <div>
          <label htmlFor="sticker" className="mb-1.5 block text-sm font-medium text-brand-900">
            Sticker design{" "}
            <span className="font-normal text-brand-800/60">(required)</span>
          </label>
          {sticker ? (
            <div className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.url}
                alt="Your sticker design"
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-700">Design uploaded ✓</p>
                <button
                  type="button"
                  onClick={() => {
                    setSticker(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs text-brand-700/70 underline hover:text-red-600"
                >
                  Remove / replace
                </button>
              </div>
            </div>
          ) : (
            <input
              id="sticker"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full text-sm text-brand-800 file:mr-3 file:rounded-full file:border-0 file:bg-cream-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-cream-300"
            />
          )}
          <p className="mt-1 text-xs text-brand-800/60">
            JPEG, PNG or WEBP. This is the artwork we print on your round sticker.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {/* Price + add */}
      <div className="border-t border-cream-200 pt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-brand-800/70">Price each</span>
          <span className="text-xl font-bold text-brand-700">
            {formatMoney(unitCents)}
            {surchargeCents > 0 ? (
              <span className="ml-2 text-sm font-normal text-brand-800/60">
                (incl. +{formatMoney(surchargeCents)} options)
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <QuantitySelector value={qty} onChange={setQty} ariaLabel="Quantity" />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="store-btn-primary !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : added ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
