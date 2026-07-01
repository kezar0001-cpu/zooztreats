import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveProductBySlug, getPrimaryImage } from "@/lib/products";
import { getRibbonColours, getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { ProductImage } from "@/components/store/ProductImage";
import { AddToCartButton } from "@/components/store/AddToCartButton";
import { BoxConfigurator } from "@/components/store/BoxConfigurator";
import type { StoreProduct } from "@/types/store";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Treat not found" };

  const primary = getPrimaryImage(product);
  const description =
    product.description ??
    `${product.name} — freshly baked to order by Zooz Treats in Montreal.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: `${siteUrl}/products/${product.slug}`,
      images: primary?.image_url ? [{ url: primary.image_url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const images = product.product_images;
  const primary = getPrimaryImage(product);

  const storeProduct: StoreProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    prep_time_note: product.prep_time_note,
    allergens: product.allergens,
    price_cents: product.price_cents,
    featured: product.featured,
    box_type: product.box_type ?? null,
    image_url: primary?.image_url ?? null,
    image_alt: primary?.alt_text ?? null,
  };

  // Party / premium boxes need the ribbon list + option surcharges to configure.
  const isConfigurable =
    product.box_type === "party" || product.box_type === "premium";
  const [ribbonColours, settings] = isConfigurable
    ? await Promise.all([getRibbonColours(), getSettings()])
    : [[], null];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: primary?.image_url ?? undefined,
    category: product.category ?? undefined,
    offers: {
      "@type": "Offer",
      price: (product.price_cents / 100).toFixed(2),
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/products/${product.slug}`,
    },
  };

  return (
    <div className="bg-cream-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link
          href="/#menu"
          className="text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          ← Back to menu
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Gallery */}
          <div className="space-y-3">
            <ProductImage
              src={primary?.image_url ?? null}
              alt={primary?.alt_text ?? product.name}
              className="aspect-square w-full rounded-3xl"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 8).map((img) => (
                  <ProductImage
                    key={img.id}
                    src={img.image_url}
                    alt={img.alt_text ?? product.name}
                    className="aspect-square w-full rounded-xl"
                    sizes="120px"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Info */}
          <div>
            {product.category ? (
              <span className="inline-block rounded-full bg-caramel-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {product.category}
              </span>
            ) : null}
            <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900">
              {product.name}
            </h1>
            <p className="mt-2 text-2xl font-bold text-brand-700">
              {formatMoney(product.price_cents)}
            </p>

            {product.description ? (
              <p className="mt-5 leading-relaxed text-brand-800/80">
                {product.description}
              </p>
            ) : null}

            {product.prep_time_note ? (
              <p className="mt-4 flex items-center gap-1.5 text-sm text-brand-700/80">
                <span aria-hidden>⏱️</span>
                {product.prep_time_note}
              </p>
            ) : null}

            <div className="mt-7">
              {isConfigurable && settings ? (
                <BoxConfigurator
                  product={storeProduct}
                  ribbonColours={ribbonColours}
                  surcharges={{
                    partySticker: settings.party_sticker_surcharge_cents,
                    premiumWax: settings.premium_wax_surcharge_cents,
                    premiumSticker: settings.premium_sticker_surcharge_cents,
                  }}
                />
              ) : (
                <AddToCartButton product={storeProduct} />
              )}
            </div>

            {product.allergens ? (
              <div className="mt-8 rounded-2xl border border-cream-300 bg-white p-4">
                <h2 className="text-sm font-semibold text-brand-900">
                  Allergens &amp; ingredients
                </h2>
                <p className="mt-1 whitespace-pre-line text-sm text-brand-800/70">
                  {product.allergens}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
      <CartDrawer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
