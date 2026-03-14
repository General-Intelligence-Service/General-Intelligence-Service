"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

const SCANNER_ELEMENT_ID = "gift-qr-scanner";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  disabled?: boolean;
}

export function QRScanner({ onScan, disabled }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      scannerRef.current.clear();
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, [isScanning]);

  const startScanner = useCallback(async () => {
    setError(null);
    setStarting(true);
    if (scannerRef.current) {
      await stopScanner();
    }
    await new Promise((r) => setTimeout(r, 100));
    const el = document.getElementById(SCANNER_ELEMENT_ID);
    if (!el) {
      setError("العنصر غير موجود");
      setStarting(false);
      return;
    }
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذر تشغيل الكاميرا";
      setError(msg);
      scannerRef.current = null;
    }
    setStarting(false);
  }, [onScan, stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  const showCamera = starting || isScanning;

  return (
    <div className="space-y-4">
      {!isScanning && (
        <Button
          type="button"
          onClick={startScanner}
          disabled={disabled || starting}
          className="min-h-[44px] w-full sm:w-auto"
        >
          {starting ? "جاري التشغيل..." : "بدء المسح"}
        </Button>
      )}
      {isScanning && (
        <Button
          type="button"
          variant="outline"
          onClick={stopScanner}
          className="min-h-[44px] w-full sm:w-auto"
        >
          إيقاف المسح
        </Button>
      )}
      <div
        id={SCANNER_ELEMENT_ID}
        className="overflow-hidden rounded-lg border border-border bg-muted/50"
        style={{ minHeight: showCamera ? 240 : 0, display: showCamera ? "block" : "none" }}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
