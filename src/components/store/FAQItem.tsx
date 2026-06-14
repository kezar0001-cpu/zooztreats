"use client";

import { useState } from "react";

export function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium text-brand-900">{question}</span>
        <span
          className={`shrink-0 text-brand-500 transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 text-sm leading-relaxed text-brand-800/75">
          {answer}
        </div>
      ) : null}
    </div>
  );
}
