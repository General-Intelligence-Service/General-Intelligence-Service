import { Metadata } from "next";
import { siteConfig } from "@/lib/config";

const SITE_URL = "https://general-intelligence-service.vercel.app";
const ogImage = `${SITE_URL}${siteConfig.logoPath}?v=${siteConfig.logoAssetVersion}`;

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    url: SITE_URL,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.logoAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: `${siteConfig.iconPath}?v=${siteConfig.logoAssetVersion}`,
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `${siteConfig.iconPath}?v=${siteConfig.logoAssetVersion}`,
        type: "image/png",
      },
    ],
  },
};
