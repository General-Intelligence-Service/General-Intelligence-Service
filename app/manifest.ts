import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b443a",
    theme_color: "#0b443a",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: siteConfig.iconPath, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: siteConfig.iconPath, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
