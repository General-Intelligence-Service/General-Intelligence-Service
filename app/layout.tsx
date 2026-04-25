import type { Metadata } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";
import { defaultMetadata } from "./metadata";
import { OrderLayoutClient } from "@/components/order-layout-client";
import { SWRegister } from "@/components/sw-register";
import { ToasterClient } from "@/components/toaster-client";
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider";
import { ThemeProvider } from "@/components/theme-provider";

const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-kufi",
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
      className={`${kufi.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body className={`${kufi.className} antialiased`}>
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

