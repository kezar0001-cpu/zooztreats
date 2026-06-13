"use client";

import { useActionState, useRef, useEffect } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import type { ActionResult } from "@/lib/types";

type UploadAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

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

  // Reset the file input after a successful upload.
  useEffect(() => {
    if (state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="product_id" value={productId} />
      <input
        type="file"
        name="images"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
        required
      />
      <p className="text-xs text-gray-400">
        JPEG, PNG, WEBP or GIF · up to 5 MB each · select multiple to upload at once.
      </p>

      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert variant="success">{state.message ?? "Uploaded."}</Alert>
      ) : null}

      <SubmitButton pendingText="Uploading…">Upload images</SubmitButton>
    </form>
  );
}
