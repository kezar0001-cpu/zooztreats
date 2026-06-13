"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/admin/Alert";
import { signIn } from "@/app/admin/login/actions";
import type { ActionResult } from "@/lib/types";

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signIn,
    null,
  );

  const errorMessage = state && !state.ok ? state.error : initialError;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <div>
        <label htmlFor="email" className="admin-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="admin-input"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="admin-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="admin-input"
          required
        />
      </div>

      <SubmitButton className="admin-btn-primary w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
