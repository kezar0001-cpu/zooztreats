import Link from "next/link";
import { ClearCartOnMount } from "@/components/store/ClearCartOnMount";

export const dynamic = "force-dynamic";

// Order confirmation page. Deliberately does NOT display order details — it only
// confirms receipt so no sensitive information is exposed publicly.
export default function SuccessPage() {
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
          You will receive confirmation shortly.
        </p>
        <Link href="/" className="store-btn-primary mt-7 inline-flex">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
