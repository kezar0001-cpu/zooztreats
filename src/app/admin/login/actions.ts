"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

function safeRedirectPath(input: FormDataEntryValue | null): string {
  const value = String(input ?? "");
  // Only allow internal admin paths to avoid open-redirects.
  if (value.startsWith("/admin")) return value;
  return "/admin";
}

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  // Block non-admins before even attempting sign-in.
  if (!isAdminEmail(email)) {
    return {
      ok: false,
      error: "This email is not authorized for the admin dashboard.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: "Invalid email or password." };
  }

  // Double-check the authenticated user really is an admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account is not authorized for the admin dashboard.",
    };
  }

  redirect(safeRedirectPath(formData.get("redirectTo")));
}
