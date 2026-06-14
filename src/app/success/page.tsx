import Link from "next/link";
import { ClearCartOnMount } from "@/components/store/ClearCartOnMount";
import { CopyLinkButton } from "@/components/store/CopyLinkButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getOrderRefBySession } from "@/lib/orders";
import { env } from "@/lib/env";

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
  const ref = session_id ? await getOrderRefBySession(session_id) : null;

  const statusPath = ref ? `/orders/${ref.token}` : null;
  const statusUrl =
    ref && env.siteUrl ? `${env.siteUrl}/orders/${ref.token}` : statusPath;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blush-50 to-cream-100 px-4 py-12">
      <ClearCartOnMount />
      <div className="w-full max-w-md rounded-3xl border border-cream-300 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto">
          <BrandLogo size={72} priority />
        </div>
        <h1 className="mt-5 font-serif text-3xl font-bold text-brand-900">
          Thank you, your order has been received
        </h1>

        {ref ? (
          <p className="mt-3 text-sm font-medium text-brand-800">
            Order reference{" "}
            <span className="font-mono font-semibold text-brand-900">
              #{ref.id.slice(0, 8)}
            </span>
          </p>
        ) : null}

        <p className="mt-3 text-brand-800/80">
          Stripe will send your payment receipt to the email you used at
          checkout.
        </p>

        {statusPath ? (
          <>
            <p className="mt-1 text-brand-800/80">
              You can track your order using the link below.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <Link href={statusPath} className="store-btn-primary inline-flex">
                Track your order
              </Link>
              <CopyLinkButton url={statusUrl ?? statusPath} />
              <Link href="/" className="store-btn-secondary inline-flex">
                Back to home
              </Link>
            </div>

            <p className="mt-6 rounded-2xl bg-blush-50 px-4 py-3 text-sm text-brand-800">
              💡 Save this link so you can check your order status later.
            </p>
          </>
        ) : (
          <div className="mt-6">
            <Link href="/" className="store-btn-primary inline-flex">
              Back to home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
