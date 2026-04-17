import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { defaultMetadata } from "./metadata";
import { OrderLayoutClient } from "@/components/order-layout-client";
import { SWRegister } from "@/components/sw-register";
import { ToasterClient } from "@/components/toaster-client";
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="ar" className={`${cairo.variable} scroll-smooth`}>
      <body className={`${cairo.className} antialiased`}>
        <ConfirmDialogProvider>
          <OrderLayoutClient>{children}</OrderLayoutClient>
        </ConfirmDialogProvider>
        <ToasterClient />
        <SWRegister />
      </body>
    </html>
  );
}

