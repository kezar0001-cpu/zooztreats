import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/products";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
  ];

  try {
    const products = await getActiveProducts();
    for (const p of products) {
      base.push({
        url: `${siteUrl}/products/${p.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If products can't be loaded (e.g. at build without env), return the
    // homepage entry only.
  }

  return base;
}
