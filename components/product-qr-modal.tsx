"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const QR_API = "https://api.qrserver.com/v1/create-qr-code";

export function ProductQRModal({
  sku,
  productName,
  onClose,
}: {
  sku: string;
  productName: string;
  onClose: () => void;
}) {
  const [copyDone, setCopyDone] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const qrSrc = `${QR_API}/?size=256x256&data=${encodeURIComponent(sku)}`;

  const handleCopySku = async () => {
    try {
      if (typeof navigator?.clipboard?.writeText === "function") {
        await navigator.clipboard.writeText(sku);
        setCopyDone(true);
        setTimeout(() => setCopyDone(false), 2500);
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadImage = async () => {
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${productName.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch {
      // fallback: open in new tab
      const a = document.createElement("a");
      a.href = qrSrc;
      a.download = `qr-${productName.replace(/\s+/g, "-")}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="رمز QR للهدية"
    >
      <div
        className="relative rounded-xl bg-background p-6 shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-center mb-4 mt-2">رمز QR للهدية</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">{productName}</p>
        <p className="text-xs text-muted-foreground text-center mb-4">الكود: <span className="font-semibold text-foreground">{sku}</span></p>

        <div className="flex justify-center mb-4">
          <Image
            src={qrSrc}
            alt={`QR ${sku}`}
            className="w-48 h-48 rounded-lg border bg-white object-contain"
            width={256}
            height={256}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={handleDownloadImage}
            className="inline-flex items-center justify-center min-h-[44px] rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {downloadDone ? "تم التحميل" : "تحميل صورة QR"}
          </button>
          <button
            type="button"
            onClick={handleCopySku}
            className="inline-flex items-center justify-center min-h-[44px] rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            {copyDone ? "تم النسخ" : "نسخ الكود"}
          </button>
        </div>
      </div>
    </div>
  );
}
