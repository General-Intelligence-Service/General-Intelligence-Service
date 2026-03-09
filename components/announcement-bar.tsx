"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { siteConfig } from "@/lib/config";

const STORAGE_KEY = "announcement_dismissed";

export function AnnouncementBar() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const msg = siteConfig.announcement?.trim();
    if (!msg) {
      setHidden(true);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      setHidden(dismissed === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setHidden(true);
    } catch {
      setHidden(true);
    }
  };

  const msg = siteConfig.announcement?.trim();
  if (!msg || hidden) return null;

  return (
    <div className="relative bg-brand-green text-white py-2.5 px-4 text-center text-sm font-medium">
      <p className="px-8">{msg}</p>
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
