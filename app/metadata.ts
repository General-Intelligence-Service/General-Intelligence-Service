import { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const defaultMetadata: Metadata = {
  metadataBase: new URL("https://yourdomain.com"), // غيّر هذا إلى رابط موقعك
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["هدايا", "هدايا فاخرة", "هدايا تراثية", "كتالوج هدايا", "معرض هدايا", "عرض هدايا"],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://yourdomain.com",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

