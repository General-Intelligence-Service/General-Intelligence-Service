import { MetadataRoute } from "next";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-login-path";

const SITE_URL = "https://general-intelligence-service.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/dashboard/", ADMIN_LOGIN_PATH],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
