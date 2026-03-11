"use client";

import { OrderProvider } from "@/contexts/order-context";
import { OrderCart } from "@/components/order-cart";
import { AnnouncementBar } from "@/components/announcement-bar";
import { WelcomeTip } from "@/components/welcome-tip";
import { ScrollToTop } from "@/components/scroll-to-top";

export function OrderLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderProvider>
      <AnnouncementBar />
      <OrderCart />
      <WelcomeTip />
      <ScrollToTop />
      {children}
    </OrderProvider>
  );
}
