import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

const title = "Zooz Treats — Fresh Montreal Bakery";
const description =
  "Freshly baked cookies and treats, made to order in Montreal. Ship across Canada or pick up locally. Prices in CAD.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Zooz Treats",
  },
  description,
  applicationName: "Zooz Treats",
  keywords: [
    "Zooz Treats",
    "Montreal bakery",
    "cookies",
    "home bakery",
    "made to order",
    "CAD",
  ],
  openGraph: {
    type: "website",
    siteName: "Zooz Treats",
    title,
    description,
    url: siteUrl,
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

// Bakery structured data for rich results.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  name: "Zooz Treats",
  description,
  url: siteUrl,
  servesCuisine: "Bakery",
  areaServed: "CA",
  priceRange: "$$",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
