import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role Supabase client for trusted server-side operations (checkout,
// webhooks, admin reads of orders). Bypasses RLS — NEVER import this into a
// client component or expose the key to the browser. The `server-only` import
// will fail the build if this module is ever pulled into client code.
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
