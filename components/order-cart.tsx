"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus, Trash2, ShoppingCart, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrder } from "@/contexts/order-context";
import { siteConfig } from "@/lib/config";
import { saveOrderToHistory } from "@/types/order";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function OrderCart() {
  const {
    orderItems,
    updateQuantity,
    removeFromOrder,
    clearOrder,
    totalItems,
    lastAddedName,
    requesterName,
    setRequesterName,
    orderNotes,
  } = useOrder();
  const [isOpen, setIsOpen] = useState(false);
  const [sendByEmail, setSendByEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExportPDF = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const notes = orderNotes?.trim() || undefined;
      const reqName = requesterName.trim() || undefined;
      const dateStr = new Date().toISOString().split("T")[0];

      const { generatePDFBlob } = await import("@/lib/pdf-generator");
      const blob = await generatePDFBlob(orderItems, siteConfig, notes, reqName ?? undefined);

      if (sendByEmail && (emailTo.trim() || true)) {
        try {
          const pdfBase64 = await blobToBase64(blob);
          await fetch("/api/orders/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: emailTo.trim() || undefined,
              pdfBase64,
            }),
          });
        } catch (e) {
          console.error("Send email failed:", e);
          alert("تم تنزيل PDF، لكن إرسال البريد فشل.");
        }
      }

      const orderId = `order-${Date.now()}`;
      saveOrderToHistory({
        id: orderId,
        date: dateStr,
        requesterName: reqName ?? "",
        notes,
        items: orderItems.map((item) => ({
          slug: item.product.slug,
          sku: item.product.sku,
          name: item.product.name,
          quantity: item.quantity,
          giftTier: item.product.giftTier,
          category: item.product.category,
        })),
        totalPieces: totalItems,
        createdAt: new Date().toISOString(),
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `طلبية-هدايا-${dateStr}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      clearOrder();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-light shadow-xl shadow-brand-green/30 ring-2 ring-white/20 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-brand-green/40 hover:ring-4 hover:ring-brand-gold/40 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-gold"
            aria-label={`فتح طلبية الهدايا (${totalItems} قطعة)`}
          >
            <ShoppingCart className="h-7 w-7 text-white drop-shadow-sm transition-transform duration-300 group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-gold px-1.5 text-sm font-bold text-brand-green shadow-md ring-2 ring-white">
              {totalItems}
            </span>
          </button>
        </div>
      )}

      {/* Order Cart Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <h2 className="text-xl font-bold">طلبية الهدايا</h2>
              {lastAddedName && (
                <span className="text-sm text-green-600 font-medium animate-pulse">
                  تمت إضافة: {lastAddedName}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-xl"
              >
                ×
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {orderItems.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center gap-4 text-center">
                  <p className="text-muted-foreground">الطلبية فارغة</p>
                  <Link href="/#products" onClick={() => setIsOpen(false)}>
                    <Button variant="outline">تصفح المنتجات</Button>
                  </Link>
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
                            className="text-destructive hover:text-destructive"
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
              <div className="border-t p-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="requester" className="text-sm font-medium text-foreground block text-right">
                    الجهة الطالبة للهدية
                  </label>
                  <Input
                    id="requester"
                    type="text"
                    placeholder="مثال: إدارة الموارد البشرية"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="text-right placeholder:text-right"
                    dir="rtl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">إجمالي القطع:</span>
                  <span className="text-lg font-bold">{totalItems}</span>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={sendByEmail}
                      onChange={(e) => setSendByEmail(e.target.checked)}
                      className="rounded border-input"
                    />
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    إرسال نسخة PDF بالبريد
                  </label>
                  {sendByEmail && (
                    <Input
                      type="email"
                      placeholder="البريد المستلم (اختياري - يُستخدم البريد الافتراضي)"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="text-right"
                      dir="rtl"
                    />
                  )}
                </div>
                <Button
                  onClick={handleExportPDF}
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  <FileText className="ml-2 h-5 w-5" />
                  {isSubmitting ? "جاري الحفظ..." : "إرسال الطلب وتصدير PDF"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
