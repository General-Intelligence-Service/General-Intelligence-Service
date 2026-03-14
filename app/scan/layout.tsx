import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "مسح الهدايا",
  description: "تطبيق مسح رموز QR لتسجيل توزيع الهدايا",
  manifest: "/manifest-scan.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مسح الهدايا",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b443a",
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background" dir="rtl">
      {children}
    </div>
  );
}
