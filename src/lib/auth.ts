import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

// Returns the current user, or null if not authenticated.
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Server-side guard for admin pages and actions.
// Redirects unauthenticated/non-admin users; returns the user otherwise.
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/admin/login?error=not_admin");
  }
  return user;
}

// Variant for use inside Server Actions: throws instead of redirecting so the
// caller can return a structured error result.
export async function assertAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Not authorized.");
  }
  return user;
}
