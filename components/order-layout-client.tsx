"use client";

import { OrderProvider } from "@/contexts/order-context";
import { OrderCart } from "@/components/order-cart";

export function OrderLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderProvider>
      <OrderCart />
      {children}
    </OrderProvider>
  );
}
