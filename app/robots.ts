import { MetadataRoute } from "next";

const SITE_URL = "https://general-intelligence-service.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/dashboard/", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
