import Link from "next/link";

// Placeholder store landing page. The full customer-facing storefront is built
// in a later phase; Phase 1 focuses on the admin backend.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-6 text-center">
      <div className="max-w-xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-500">
          Home Bakery
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          Zooz Treats
        </h1>
        <p className="mt-4 text-lg text-brand-800/80">
          Soft-baked cookies and homemade treats, made fresh to order. Our
          storefront is coming soon.
        </p>
        <div className="mt-8">
          <Link href="/admin" className="admin-btn-primary">
            Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
