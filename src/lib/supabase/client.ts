"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser Supabase client (used in client components, e.g. login form).
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
