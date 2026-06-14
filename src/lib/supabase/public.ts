import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cookieless anon Supabase client for public, cacheable reads (e.g. the
// storefront product list). Because it never touches cookies/headers it is safe
// to use inside `unstable_cache`. RLS still applies — anon only sees active
// products.
export function createPublicClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
