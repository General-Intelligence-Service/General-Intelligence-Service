"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Plus, Minus, Trash2, ShoppingCart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/data/products";
import { generatePDF } from "@/lib/pdf-generator";
import { siteConfig } from "@/lib/config";

interface OrderItem {
  product: Product;
  quantity: number;
}

interface OrderCartProps {
  products: Product[];
  onAddToOrderReady?: (fn: (product: Product) => void) => void;
}

export interface OrderCartRef {
  addToOrder: (product: Product) => void;
}

export const OrderCart = forwardRef<OrderCartRef, OrderCartProps>(
  ({ products, onAddToOrderReady }, ref) => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const addToOrder = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.product.slug === product.slug);
      if (existing) {
        return prev.map((item) =>
          item.product.slug === product.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const updateQuantity = (slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(slug);
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.slug === slug ? { ...item, quantity } : item
      )
    );
  };

  const removeFromOrder = (slug: string) => {
    setOrderItems((prev) => prev.filter((item) => item.product.slug !== slug));
  };

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleExportPDF = async () => {
    await generatePDF(orderItems, siteConfig);
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({
    addToOrder,
  }));

  useEffect(() => {
    if (onAddToOrderReady) {
      onAddToOrderReady(addToOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {totalItems}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Order Cart Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <h2 className="text-xl font-bold">طلبية الهدايا</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {orderItems.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">الطلبية فارغة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <Card key={item.product.slug}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              كود: {item.product.sku}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromOrder(item.product.slug)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(
                                  item.product.slug,
                                  item.quantity - 1
                                )
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(
                                  item.product.slug,
                                  item.quantity + 1
                                )
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {orderItems.length > 0 && (
              <div className="border-t p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold">إجمالي القطع:</span>
                  <span className="text-lg font-bold">{totalItems}</span>
                </div>
                <Button
                  onClick={handleExportPDF}
                  className="w-full"
                  size="lg"
                >
                  <FileText className="ml-2 h-5 w-5" />
                  تصدير PDF
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to Order Button for each product */}
      <div className="hidden" id="order-cart-provider" />
    </>
  );
});

OrderCart.displayName = "OrderCart";

