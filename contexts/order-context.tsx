"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Product } from "@/data/products";

export interface OrderItem {
  product: Product;
  quantity: number;
}

interface OrderContextValue {
  orderItems: OrderItem[];
  addToOrder: (product: Product, quantity?: number) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  removeFromOrder: (slug: string) => void;
  /** تفريغ الطلبية بالكامل (بعد تصدير PDF أو إرسال الطلب) */
  clearOrder: () => void;
  totalItems: number;
  lastAddedName: string | null;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  requesterName: string;
  setRequesterName: (name: string) => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const lastAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToOrder = useCallback((product: Product, quantity = 1) => {
    const qty = Math.max(1, Math.min(99, quantity));
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.product.slug === product.slug);
      if (existing) {
        return prev.map((item) =>
          item.product.slug === product.slug
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setLastAddedName(product.name);
    if (lastAddedTimerRef.current) clearTimeout(lastAddedTimerRef.current);
    lastAddedTimerRef.current = setTimeout(() => {
      setLastAddedName(null);
      lastAddedTimerRef.current = null;
    }, 2500);
  }, []);

  const updateQuantity = useCallback((slug: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.product.slug !== slug));
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.slug === slug ? { ...item, quantity } : item
      )
    );
  }, []);

  const removeFromOrder = useCallback((slug: string) => {
    setOrderItems((prev) => prev.filter((item) => item.product.slug !== slug));
  }, []);

  const clearOrder = useCallback(() => {
    setOrderItems([]);
    setOrderNotes("");
    setRequesterName("");
    setLastAddedName(null);
  }, []);

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const value: OrderContextValue = {
    orderItems,
    addToOrder,
    updateQuantity,
    removeFromOrder,
    clearOrder,
    totalItems,
    lastAddedName,
    orderNotes,
    setOrderNotes,
    requesterName,
    setRequesterName,
  };

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error("useOrder must be used within OrderProvider");
  }
  return ctx;
}
