"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/qr-scanner";
import { CheckCircle2, XCircle, Minus, Plus, LogOut } from "lucide-react";

interface ScanResponse {
  status: string;
  gift_name: string;
  remaining_quantity: number;
}

interface ResolvedGift {
  qr_code: string;
  gift_name: string;
  current_quantity: number;
  sku: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<ResolvedGift | null>(null);
  const [action, setAction] = useState<"deduct" | "add">("deduct");
  const [quantity, setQuantity] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    setIsStandalone(
      typeof window !== "undefined" &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true)
    );
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login?next=/scan");
  }, [authOk, router]);

  const handleScan = async (decodedText: string) => {
    setResult(null);
    setError(null);
    setScannedValue(null);
    setResolved(null);
    setLoading(true);
    setQuantity(1);
    setAction("deduct");
    try {
      const resolveRes = await fetch("/api/gifts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code: decodedText.trim() }),
      });
      const resolveData = await resolveRes.json();

      if (resolveData.found) {
        setResolved({
          qr_code: decodedText.trim(),
          gift_name: resolveData.gift_name ?? "",
          current_quantity: resolveData.current_quantity ?? 0,
          sku: resolveData.sku ?? "",
        });
        setQuantity(1);
        setAction("deduct");
      } else {
        setError("رمز QR غير موجود في النظام");
        setScannedValue(resolveData.scanned_value ?? decodedText.trim());
      }
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!resolved) return;
    const qty = Math.max(1, Math.floor(quantity));
    if (action === "deduct" && qty > resolved.current_quantity) {
      setError(`الكمية المتوفرة ${resolved.current_quantity} فقط. لا يمكن خصم ${qty}.`);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_code: resolved.qr_code,
          action,
          quantity: qty,
        }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        setResolved(null);
        setResult({
          status: data.status,
          gift_name: data.gift_name ?? "",
          remaining_quantity: data.remaining_quantity ?? 0,
        });
      } else {
        setError(data.error ?? "فشل في تنفيذ العملية");
      }
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setConfirming(false);
    }
  };

  const clearChoice = () => {
    setResolved(null);
    setError(null);
    setScannedValue(null);
    setQuantity(1);
    setAction("deduct");
  };

  if (authOk === null) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  if (authOk === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-foreground/10 min-h-[44px] items-center justify-center touch-manipulation"
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only sm:not-sr-only">الداشبورد</span>
        </Link>
        <h1 className="text-lg font-bold">مسح الهدايا</h1>
        <div className="w-[100px]" />
      </header>

      <main className="flex-1 overflow-auto p-4 pb-safe">
        {!isStandalone && (
          <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            للتثبيت على أندرويد: قائمة المتصفح (⋮) ← إضافة إلى الشاشة الرئيسية أو تثبيت التطبيق
          </p>
        )}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الكاميرا</CardTitle>
          </CardHeader>
          <CardContent>
            <QRScanner onScan={handleScan} disabled={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">نتيجة المسح</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[120px]">
            {loading && (
              <p className="text-muted-foreground text-sm">جاري التحقق من الرمز...</p>
            )}
            {resolved && !loading && !result && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-right space-y-4">
                <div>
                  <p className="font-semibold text-foreground">الهدية: {resolved.gift_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">المتوفر: {resolved.current_quantity}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={action === "deduct" ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px] touch-manipulation"
                    onClick={() => setAction("deduct")}
                    disabled={resolved.current_quantity === 0}
                  >
                    <Minus className="ml-2 h-4 w-4" />
                    خصم
                  </Button>
                  <Button
                    type="button"
                    variant={action === "add" ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px] touch-manipulation"
                    onClick={() => setAction("add")}
                  >
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">العدد:</span>
                  <Input
                    type="number"
                    min={1}
                    max={action === "deduct" ? Math.max(1, resolved.current_quantity) : 9999}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-20 min-h-[44px] text-center touch-manipulation"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirming || (action === "deduct" && quantity > resolved.current_quantity)}
                    className="min-h-[44px] flex-1 touch-manipulation"
                  >
                    {confirming ? "جاري التنفيذ..." : "تأكيد"}
                  </Button>
                  <Button type="button" variant="outline" onClick={clearChoice} className="min-h-[44px] touch-manipulation" disabled={confirming}>
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
            {result && !loading && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-right dark:border-green-800 dark:bg-green-950/30">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-semibold">تم التسجيل</span>
                </div>
                <p className="mt-2 text-sm">{result.gift_name}</p>
                <p className="text-sm text-muted-foreground">المتبقي: {result.remaining_quantity}</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 min-h-[44px] touch-manipulation" onClick={() => setResult(null)}>
                  مسح رمز آخر
                </Button>
              </div>
            )}
            {error && !loading && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-right">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                {scannedValue && (
                  <p className="mt-2 text-xs text-muted-foreground break-all">المقروء: {scannedValue}</p>
                )}
              </div>
            )}
            {!result && !error && !loading && !resolved && (
              <p className="text-muted-foreground text-sm">امسح رمز QR لعرض النتيجة.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
