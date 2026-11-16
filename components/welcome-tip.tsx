"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, ShoppingCart, HelpCircle } from "lucide-react";

const STORAGE_KEY = "welcome_tip_seen";

export function WelcomeTip() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [seen, setSeen] = useState(true);
  const [ready, setReady] = useState(false);

  const isCatalogPage = pathname === "/" || (pathname?.startsWith("/products") ?? false);

  useEffect(() => {
    if (typeof window === "undefined" || !isCatalogPage) {
      setReady(true);
      return;
    }
    try {
      const wasSeen = localStorage.getItem(STORAGE_KEY) === "1";
      setSeen(wasSeen);
      setShow(!wasSeen);
    } catch {
      setSeen(false);
      setShow(true);
    } finally {
      setReady(true);
    }
  }, [isCatalogPage]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    setSeen(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      //
    }
  }, []);

  const reopen = useCallback(() => {
    setShow(true);
  }, []);

  if (!isCatalogPage || !ready) return null;

  return (
    <>
      {show && (
        <div
          className="no-print fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[45vh] w-full max-w-md overflow-auto rounded-t-2xl border border-b-0 bg-background p-4 shadow-xl animate-in slide-in-from-bottom-4 duration-300 md:bottom-24 md:left-6 md:right-auto md:max-h-none md:rounded-xl md:border"
          role="dialog"
          aria-label="كيف تطلب؟"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted md:hidden" aria-hidden />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-green-dark/10">
              <ShoppingCart className="h-5 w-5 text-brand-green-dark dark:text-brand-gold-light" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-bold text-foreground">كيف تطلب؟</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                اختر الهدايا واضغط <strong>أضف للطلبية</strong>، ثم افتح سلة الطلبية (أيقونة الأسفل)
                وادخل الجهة الطالبة إن رغبت، واضغط <strong>تصدير PDF</strong> لتحميل الطلبية أو
                إرسالها بالبريد.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {seen && !show && (
        <button
          type="button"
          onClick={reopen}
          className="no-print fixed bottom-6 left-[5.5rem] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/40 bg-background text-brand-green-dark shadow-md transition hover:bg-brand-gold/15 dark:text-brand-gold-light"
          aria-label="كيف تطلب؟"
          title="كيف تطلب؟"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
