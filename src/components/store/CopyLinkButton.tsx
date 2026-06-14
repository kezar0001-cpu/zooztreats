"use client";

import { useState } from "react";

// Copies a URL to the clipboard with brief visual feedback.
export function CopyLinkButton({
  url,
  className = "store-btn-secondary inline-flex",
}: {
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select nothing; clipboard may be blocked. Show no error.
    }
  };

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Link copied ✓" : "Copy status link"}
    </button>
  );
}
