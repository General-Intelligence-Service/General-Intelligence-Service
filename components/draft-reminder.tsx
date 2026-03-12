"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/contexts/order-context";
import { getOrderDraft } from "@/types/order";

const DISMISS_KEY = "draft_reminder_dismissed";

export function DraftReminder() {
  const pathname = usePathname();
  const { orderItems, openCartRef } = useOrder();
  const [show, setShow] = useState(false);
  const [draftExists, setDraftExists] = useState(false);

  useEffect(() => {
    if (orderItems.length > 0) {
      setShow(false);
      return;
    }
    const draft = getOrderDraft();
    setDraftExists(!!draft);
    if (!draft) {
      setShow(false);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === "1") {
        setShow(false);
        return;
      }
    } catch {
      // ignore
    }
    setShow(true);
  }, [orderItems.length, pathname]);

  const handleRestore = () => {
    setShow(false);
    openCartRef.current?.();
  };

  const handleDismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!show || !draftExists) return null;

  return (
    <div className="no-print fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto md:bottom-6 md:left-auto md:right-6 md:left-6" role="status" aria-live="polite">
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/80 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 flex-1">
          لديك مسودة طلبية غير مكتملة. هل تريد استعادتها؟
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] border-amber-400 text-amber-800 hover:bg-amber-100"
            onClick={handleRestore}
          >
            <RotateCcw className="ml-2 h-4 w-4" />
            استعادة المسودة
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
            aria-label="تذكيرني لاحقاً"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
