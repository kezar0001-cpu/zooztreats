"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let counter = 0;
const DURATION_MS = 3000;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = "success") => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, DURATION_MS);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Imperative helper usable from anywhere on the client without hooks.
export function toast(message: string, variant: ToastVariant = "success") {
  useToasts.getState().push(message, variant);
}
