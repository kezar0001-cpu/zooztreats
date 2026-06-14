"use client";

import { useToasts, type ToastVariant } from "@/lib/toast";

const styles: Record<ToastVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

const icons: Record<ToastVariant, string> = {
  success: "✓",
  error: "⚠",
  info: "ℹ",
};

// Single global toast region. Mounted once in the root layout; any client code
// can push via toast()/useToasts. Announced to assistive tech via aria-live.
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-soft ${styles[t.variant]}`}
        >
          <span aria-hidden className="font-bold">
            {icons[t.variant]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
