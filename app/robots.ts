import { MetadataRoute } from "next";

const SITE_URL = "https://general-intelligence-service.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // لا تذكر مسار الدخول هنا — الصفحة محمية بـ noindex
      disallow: ["/api/", "/dashboard", "/dashboard/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
