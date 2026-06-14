import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep admin, checkout internals and per-order pages out of the index.
      disallow: ["/admin", "/api", "/orders", "/success"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
