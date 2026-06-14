import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Cleans up abandoned checkouts: orders left `pending` for more than 6 hours.
// order_items cascade-delete with their order. Complements Stripe's
// checkout.session.expired handling (which can lag by up to ~24h).
//
// NOT scheduled by default (see README). To run it, either schedule it via a
// Vercel cron entry or call it manually. Protected by CRON_SECRET:
//   * If CRON_SECRET is unset, the endpoint refuses to run (503) — it never
//     performs deletions unauthenticated, and this does not affect build or
//     normal storefront/admin/checkout operation.
//   * If set, callers must send `Authorization: Bearer <CRON_SECRET>`.
const STALE_HOURS = 6;

export async function GET(request: Request) {
  const secret = env.cronSecret;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Cron endpoint is not configured. Set CRON_SECRET to enable abandoned-order cleanup.",
      },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - STALE_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .delete()
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("[reap-pending] failed:", error.message);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }

  return NextResponse.json({ reaped: data?.length ?? 0 });
}
