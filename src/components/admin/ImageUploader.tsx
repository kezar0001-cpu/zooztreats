"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

type UploadAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

// Validates files in the browser before they ever hit the server action, so an
// oversized or unsupported file gives a friendly error instead of exceeding the
// request body limit and crashing.
function validateFiles(files: FileList | null): string | null {
  if (!files || files.length === 0) return "Please choose at least one image.";
  for (const file of Array.from(files)) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      )
    ) {
      return `"${file.name}" is not a supported image type (${ALLOWED_IMAGE_EXTENSIONS}).`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the maximum is ${MAX_IMAGE_MB} MB.`;
    }
  }
  return null;
}

export function ImageUploader({
  action,
  productId,
}: {
  action: UploadAction;
  productId: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Reset the file input after a successful upload.
  useEffect(() => {
    if (state && state.ok) {
      formRef.current?.reset();
      setClientError(null);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3"
      onSubmit={(e) => {
        const input = formRef.current?.querySelector<HTMLInputElement>(
          'input[name="images"]',
        );
        const error = validateFiles(input?.files ?? null);
        if (error) {
          e.preventDefault();
          setClientError(error);
        }
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <input
        type="file"
        name="images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={() => setClientError(null)}
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        required
      />
      <p className="text-xs text-gray-400">
        {ALLOWED_IMAGE_EXTENSIONS} · up to {MAX_IMAGE_MB} MB each · select
        multiple to upload at once.
      </p>

      {clientError ? <Alert variant="error">{clientError}</Alert> : null}
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Uploaded."}</Alert>
      ) : null}

      <SubmitButton pendingText="Uploading…">Upload images</SubmitButton>
    </form>
  );
}
