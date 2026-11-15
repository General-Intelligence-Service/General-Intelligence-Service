import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { defaultMetadata } from "./metadata";
import { OrderLayoutClient } from "@/components/order-layout-client";
import { SWRegister } from "@/components/sw-register";
import { ToasterClient } from "@/components/toaster-client";
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider";
import { ThemeProvider } from "@/components/theme-provider";

const tajawal = localFont({
  src: [
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/tajawal/ArbFONTS-Tajawal-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      dir="rtl"
      lang="ar"
      className={`${tajawal.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body className={`${tajawal.className} antialiased`}>
        <ThemeProvider>
          <ConfirmDialogProvider>
            <OrderLayoutClient>{children}</OrderLayoutClient>
          </ConfirmDialogProvider>
          <ToasterClient />
          <SWRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
