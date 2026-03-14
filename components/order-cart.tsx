"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingCart, FileText, Save, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrder } from "@/contexts/order-context";
import { siteConfig } from "@/lib/config";
import { saveOrderToHistory, getOrderDraft, saveOrderDraft, clearOrderDraft } from "@/types/order";
import { products as initialProducts, type Product } from "@/data/products";

export function OrderCart() {
  const {
    orderItems,
    updateQuantity,
    removeFromOrder,
    clearOrder,
    restoreFromDraft,
    totalItems,
    lastAddedName,
    requesterName,
    setRequesterName,
    orderNotes,
    openCartRef,
  } = useOrder();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    openCartRef.current = () => setIsOpen(true);
    return () => {
      openCartRef.current = null;
    };
  }, [openCartRef]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftExists, setDraftExists] = useState(false);
  const [toast, setToast] = useState<null | { variant: "success" | "warning" | "error"; title: string; description?: string }>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [orderStepsTipSeen, setOrderStepsTipSeen] = useState(true);
  useEffect(() => {
    try {
      setOrderStepsTipSeen(localStorage.getItem("order_steps_tip_seen") === "1");
    } catch {
      setOrderStepsTipSeen(true);
    }
  }, []);
  const showOrderStepsTip = orderItems.length > 0 && !orderStepsTipSeen;
  const dismissOrderStepsTip = () => {
    setOrderStepsTipSeen(true);
    try {
      localStorage.setItem("order_steps_tip_seen", "1");
    } catch {}
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const makeOrderReference = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `REF-${y}${m}${day}-${rnd}`;
  };

  useEffect(() => {
    if (isOpen && orderItems.length === 0) {
      setDraftExists(!!getOrderDraft());
    }
  }, [isOpen, orderItems.length]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (orderItems.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [orderItems.length]);

  const handleSaveDraft = () => {
    if (orderItems.length === 0) return;
    saveOrderDraft({
      items: orderItems.map((i) => ({ slug: i.product.slug, quantity: i.quantity })),
      requesterName,
      orderNotes,
      savedAt: new Date().toISOString(),
    });
    setDraftExists(false);
    setToast({ variant: "success", title: "تم حفظ المسودة", description: "يمكنك استعادتها لاحقاً عند فتح الطلبية." });
  };

  const handleShareOrderLink = () => {
    if (orderItems.length === 0) return;
    const payload = {
      items: orderItems.map((i) => ({ slug: i.product.slug, quantity: i.quantity })),
      requesterName: requesterName.trim() || "",
      orderNotes: orderNotes?.trim() || "",
    };
    try {
      const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(JSON.stringify(payload))) : "";
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/order?d=${encodeURIComponent(b64)}`;
      if (typeof navigator?.clipboard?.writeText === "function") {
        navigator.clipboard.writeText(url);
        setShareLinkCopied(true);
        setToast({ variant: "success", title: "تم نسخ رابط الطلبية", description: "شارك الرابط مع زميلك لاستعراض أو استيراد الطلبية." });
        setTimeout(() => setShareLinkCopied(false), 2500);
      } else {
        setToast({ variant: "success", title: "رابط الطلبية", description: url });
      }
    } catch (e) {
      setToast({ variant: "error", title: "تعذر إنشاء الرابط", description: "حاول مرة أخرى." });
    }
  };

  const handleRestoreDraft = () => {
    const draft = getOrderDraft();
    if (!draft) return;
    let productsList: Product[] = initialProducts;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("products");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Product[];
          const merged = [...initialProducts];
          parsed.forEach((p) => {
            const i = merged.findIndex((e) => e.slug === p.slug);
            if (i >= 0) merged[i] = p;
            else merged.push(p);
          });
          productsList = merged;
        } catch {}
      }
    }
    const items = draft.items
      .map(({ slug, quantity }) => {
        const product = productsList.find((p) => p.slug === slug);
        return product ? { product, quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);
    restoreFromDraft(items, draft.requesterName || "", draft.orderNotes || "");
    clearOrderDraft();
    setDraftExists(false);
  };

  const handleExportPDF = async () => {
    if (isSubmitting || orderItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const notes = orderNotes?.trim() || undefined;
      const reqName = requesterName.trim() || undefined;
      const dateStr = new Date().toISOString().split("T")[0];
      const orderRef = makeOrderReference();

      const { generatePDFBlob } = await import("@/lib/pdf-generator");
      const blob = await generatePDFBlob(orderItems, siteConfig, notes, reqName ?? undefined);

      saveOrderToHistory({
        id: orderRef,
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

      setToast({ variant: "success", title: "تم تحميل ملف PDF", description: `رقم مرجعي: ${orderRef}` });
      clearOrder();
      clearOrderDraft();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      setToast({ variant: "error", title: "تعذر إنشاء ملف PDF", description: "حاول مرة أخرى." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="no-print">
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-[60] flex justify-center md:bottom-6">
          <div
            className={
              toast.variant === "success"
                ? "w-full max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg"
                : toast.variant === "warning"
                ? "w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg"
                : "w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg"
            }
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="font-semibold text-foreground">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-md px-3 text-sm font-medium text-foreground/70 hover:bg-black/5"
                onClick={() => setToast(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <motion.div
          className="fixed bottom-6 left-6 z-50"
          animate={{ scale: lastAddedName ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
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
        </motion.div>
      )}

      {/* Order Cart Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-xl">
            <div className="flex h-14 sm:h-16 items-center justify-between border-b px-4 sm:px-6">
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {showOrderStepsTip && (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-right">
                  <p className="text-sm font-semibold text-foreground mb-2">خطوات إتمام الطلب:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>اختر المنتجات من الكتالوج وأضفها للطلبية</li>
                    <li>أدخل اسم الجهة الطالبة (اختياري)</li>
                    <li>اضغط &quot;تحميل PDF&quot; لتحميل الطلبية</li>
                  </ol>
                  <button type="button" onClick={dismissOrderStepsTip} className="mt-2 text-xs text-primary font-medium hover:underline">تم، إخفاء</button>
                </div>
              )}
              {orderItems.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center gap-4 text-center">
                  {draftExists && (
                    <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">لديك مسودة طلبية محفوظة</p>
                      <Button variant="default" size="sm" onClick={handleRestoreDraft}>
                        <RotateCcw className="ml-2 h-4 w-4" />
                        استعادة المسودة
                      </Button>
                    </div>
                  )}
                  <p className="text-muted-foreground">الطلبية فارغة</p>
                  <Link href="/#products" onClick={() => setIsOpen(false)}>
                    <Button variant="outline">تصفح المنتجات</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {orderItems.map((item) => (
                    <Card key={item.product.slug}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{item.product.name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              كود: {item.product.sku}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromOrder(item.product.slug)}
                            className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 shrink-0 text-destructive hover:text-destructive touch-manipulation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 touch-manipulation"
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
                              className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 touch-manipulation"
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
              <div className="border-t p-4 sm:p-6 space-y-3 sm:space-y-4">
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
                <Button variant="outline" size="sm" className="w-full" onClick={handleSaveDraft}>
                  <Save className="ml-2 h-4 w-4" />
                  حفظ كمسودة
                </Button>
                <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={handleShareOrderLink}>
                  <Share2 className="ml-2 h-4 w-4" />
                  {shareLinkCopied ? "تم النسخ!" : "مشاركة رابط الطلبية"}
                </Button>
                <Button
                  onClick={handleExportPDF}
                  className="w-full min-h-[44px] touch-manipulation"
                  size="lg"
                  disabled={isSubmitting}
                >
                  <FileText className="ml-2 h-5 w-5" />
                  {isSubmitting ? "جاري التحميل..." : "تحميل PDF"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
