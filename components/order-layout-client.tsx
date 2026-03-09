"use client";

import { OrderProvider } from "@/contexts/order-context";
import { OrderCart } from "@/components/order-cart";
import { AnnouncementBar } from "@/components/announcement-bar";
import { WelcomeTip } from "@/components/welcome-tip";

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
      {children}
    </OrderProvider>
  );
}
