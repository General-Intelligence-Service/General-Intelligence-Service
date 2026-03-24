import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

/** يُولَّد ديناميكياً لاستخدام نفس مسار الشعار الموحّد في siteConfig */
export async function GET() {
  const body = {
    name: "مسح الهدايا",
    short_name: "مسح الهدايا",
    description: "تطبيق مسح رموز QR لتسجيل توزيع الهدايا",
    start_url: "/scan",
    scope: "/scan",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b443a",
    theme_color: "#0b443a",
    dir: "rtl",
    lang: "ar",
    icons: [
      {
        src: siteConfig.logoPath,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: siteConfig.logoPath,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
