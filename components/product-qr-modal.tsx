"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const QR_API = "https://api.qrserver.com/v1/create-qr-code";

export function ProductQRModal({
  productUrl,
  productName,
  onClose,
}: {
  productUrl: string;
  productName: string;
  onClose: () => void;
}) {
  const qrSrc = `${QR_API}/?size=256x256&data=${encodeURIComponent(productUrl)}`;

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
      aria-label="رمز QR للمنتج"
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

        <h3 className="text-lg font-bold text-center mb-4 mt-2">رمز QR للمنتج</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">{productName}</p>

        <div className="flex justify-center mb-4">
          <img
            src={qrSrc}
            alt={`QR لصفحة ${productName}`}
            className="w-48 h-48 rounded-lg border bg-white"
            width={256}
            height={256}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <a
            href={qrSrc}
            target="_blank"
            rel="noopener noreferrer"
            download={`qr-${productName.replace(/\s+/g, "-")}.png`}
            className="inline-flex items-center justify-center min-h-[44px] rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            تحميل صورة QR
          </a>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator?.clipboard?.writeText === "function") {
                navigator.clipboard.writeText(productUrl);
              }
            }}
            className="inline-flex items-center justify-center min-h-[44px] rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            نسخ الرابط
          </button>
        </div>
      </div>
    </div>
  );
}
