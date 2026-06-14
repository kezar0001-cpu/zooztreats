import Link from "next/link";
import { ClearCartOnMount } from "@/components/store/ClearCartOnMount";
import { getOrderTokenBySession } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Order confirmation page. Looks up the order token for the completed Stripe
// session so the buyer can follow their order status, but never displays
// sensitive details inline.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const token = session_id ? await getOrderTokenBySession(session_id) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blush-50 to-cream-100 px-4">
      <ClearCartOnMount />
      <div className="w-full max-w-md rounded-3xl border border-cream-300 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          🍪
        </div>
        <h1 className="mt-5 font-serif text-3xl font-bold text-brand-900">
          Thank you for your order
        </h1>
        <p className="mt-3 text-brand-800/80">
          Zooz Treats has received your order.
        </p>
        <p className="mt-1 text-brand-800/80">
          A confirmation email is on its way.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          {token ? (
            <Link href={`/orders/${token}`} className="store-btn-primary inline-flex">
              Track your order
            </Link>
          ) : null}
          <Link
            href="/"
            className={
              token
                ? "store-btn-secondary inline-flex"
                : "store-btn-primary inline-flex"
            }
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
