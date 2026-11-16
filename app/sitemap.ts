import { MetadataRoute } from "next";
import { products } from "@/data/products";

const SITE_URL = "https://general-intelligence-service.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const productRoutes = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...productRoutes,
  ];
}
