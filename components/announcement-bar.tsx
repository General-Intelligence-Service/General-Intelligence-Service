"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { siteConfig } from "@/lib/config";

const STORAGE_KEY = "announcement_dismissed";

function getDeliveryDateText(): string {
  const offset = (siteConfig as { deliveryDaysOffset?: number }).deliveryDaysOffset ?? 5;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function AnnouncementBar() {
  const [hidden, setHidden] = useState(true);
  const [deliveryDateText, setDeliveryDateText] = useState<string>("");

  useEffect(() => {
    setDeliveryDateText(getDeliveryDateText());
  }, []);

  useEffect(() => {
    const msg = siteConfig.announcement?.trim();
    const deadline = siteConfig.deliveryDeadlineText?.trim();
    const hasDynamic = deliveryDateText.length > 0;
    if (!msg && !deadline && !hasDynamic) {
      setHidden(true);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      setHidden(dismissed === "1");
    } catch {
      setHidden(false);
    }
  }, [deliveryDateText]);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setHidden(true);
    } catch {
      setHidden(true);
    }
  };

  const msg = siteConfig.announcement?.trim();
  const deadline = siteConfig.deliveryDeadlineText?.trim();
  if ((!msg && !deadline && !deliveryDateText) || hidden) return null;

  return (
    <div className="no-print relative bg-brand-green text-white py-2.5 px-4 text-center text-sm font-medium">
      <div className="px-8 space-y-1">
        {msg ? <p>{msg}</p> : null}
        {deadline ? <p className="opacity-95 font-normal text-xs sm:text-sm">— {deadline}</p> : null}
        {deliveryDateText ? <p className="opacity-95 font-normal text-xs sm:text-sm">— آخر موعد للطلب لاستلام في: {deliveryDateText}</p> : null}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition-colors"
        aria-label="إخفاء"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
