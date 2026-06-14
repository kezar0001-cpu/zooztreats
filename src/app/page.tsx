import { Suspense } from "react";
import { getActiveProducts } from "@/lib/products";
import { Header } from "@/components/store/Header";
import { Hero } from "@/components/store/Hero";
import { ProductGrid } from "@/components/store/ProductGrid";
import { MenuSkeleton } from "@/components/store/MenuSkeleton";
import { HowItWorks } from "@/components/store/HowItWorks";
import { TrustSection } from "@/components/store/TrustSection";
import { FAQ } from "@/components/store/FAQ";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CheckoutCancelledNotice } from "@/components/store/CheckoutCancelledNotice";

// Async server component: loads active products from Supabase and handles the
// error state. Wrapped in <Suspense> for the loading state.
async function Menu() {
  try {
    const products = await getActiveProducts();
    return <ProductGrid products={products} />;
  } catch {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="text-3xl" aria-hidden>
          😞
        </p>
        <h3 className="mt-3 font-serif text-xl font-semibold text-brand-900">
          We couldn&apos;t load the menu
        </h3>
        <p className="mt-2 text-sm text-brand-800/70">
          Something went wrong fetching our treats. Please refresh the page or
          try again in a moment.
        </p>
      </div>
    );
  }
}

export default function HomePage() {
  return (
    <div id="top" className="bg-cream-50">
      <Header />
      <main>
        <Hero />

        <section id="menu" className="bg-cream-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold text-brand-900 sm:text-4xl">
                Our Menu
              </h2>
              <p className="mt-3 text-brand-800/70">
                Freshly baked cookies and treats, made to order.
              </p>
            </div>
            <div className="mt-10">
              <Suspense fallback={<MenuSkeleton />}>
                <Menu />
              </Suspense>
            </div>
          </div>
        </section>

        <HowItWorks />
        <TrustSection />
        <FAQ />
      </main>
      <Footer />
      <CartDrawer />
      <CheckoutCancelledNotice />
    </div>
  );
}
