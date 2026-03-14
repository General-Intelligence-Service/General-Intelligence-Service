"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/qr-scanner";
import { ArrowRight, CheckCircle2, XCircle, QrCode, Info, Minus, Plus } from "lucide-react";

export interface ScanResponse {
  status: string;
  gift_name: string;
  remaining_quantity: number;
}

export interface ResolvedGift {
  qr_code: string;
  gift_name: string;
  current_quantity: number;
  sku: string;
}

export default function GiftScannerPage() {
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

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  if (authOk === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold">مسح الهدايا</h1>
              <p className="text-muted-foreground">
                امسح رمز QR على الهدية لتسجيل التوزيع وإنقاص الكمية من المخزون
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>

          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3 text-right">
                <Info className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">ما الذي يجب أن يكون داخل رمز QR؟</p>
                  <p className="text-muted-foreground">
                    يجب أن يحتوي الرمز على <strong>كود الهدية (SKU)</strong> مثل <code className="rounded bg-muted px-1.5 py-0.5">G01</code> أو <code className="rounded bg-muted px-1.5 py-0.5">G02</code>، أو <strong>رابط صفحة المنتج</strong> من الموقع. عند المسح يبحث النظام عن المنتج وينقص الكمية.
                  </p>
                  <p className="font-semibold text-foreground mt-3">أين يوضع رمز QR؟</p>
                  <p className="text-muted-foreground">
                    على <strong>الهدية نفسها</strong> أو على <strong>غلافها</strong> أو على <strong>ملصق (ستيكر)</strong> تلصقه على الهدية، بحيث يمكن مسحه عند توزيع الهدية لتسجيل الخصم من المخزون.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/dashboard/qr-codes">
            <Button variant="outline" className="w-full mb-6 min-h-[44px]">
              <QrCode className="ml-2 h-5 w-5" />
              تحميل رموز QR للمنتجات (صفحة مستقلة)
            </Button>
          </Link>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">الكاميرا</CardTitle>
            </CardHeader>
            <CardContent>
              <QRScanner onScan={handleScan} disabled={loading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نتيجة المسح</CardTitle>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                تظهر النتيجة ثابتة لفترة؛ انتظر حوالي ٣ ثوانٍ قبل مسح الرمز التالي.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[140px]">
              {loading && (
                <p className="text-muted-foreground">جاري التحقق من الرمز...</p>
              )}
              {resolved && !loading && !result && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-right space-y-4">
                  <div>
                    <p className="font-semibold text-foreground">الهدية: {resolved.gift_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">المتوفر حالياً: {resolved.current_quantity}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={action === "deduct" ? "default" : "outline"}
                      size="sm"
                      className="min-h-[44px]"
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
                      className="min-h-[44px]"
                      onClick={() => setAction("add")}
                    >
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-foreground">العدد:</label>
                    <Input
                      type="number"
                      min={1}
                      max={action === "deduct" ? Math.max(1, resolved.current_quantity) : 9999}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      className="w-24 min-h-[44px] text-center"
                    />
                    {action === "deduct" && resolved.current_quantity > 0 && (
                      <span className="text-xs text-muted-foreground">(الحد الأقصى للخصم: {resolved.current_quantity})</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleConfirm}
                      disabled={confirming || (action === "deduct" && quantity > resolved.current_quantity)}
                      className="min-h-[44px]"
                    >
                      {confirming ? "جاري التنفيذ..." : "تأكيد"}
                    </Button>
                    <Button type="button" variant="outline" onClick={clearChoice} className="min-h-[44px]" disabled={confirming}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
              {result && !loading && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-right dark:border-green-800 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="font-semibold">تم تسجيل الهدية بنجاح</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    <span className="text-muted-foreground">اسم الهدية:</span>{" "}
                    {result.gift_name}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">المتبقي:</span>{" "}
                    {result.remaining_quantity}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setResult(null)}>
                    مسح رمز آخر
                  </Button>
                </div>
              )}
              {error && !loading && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-right">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {scannedValue && (
                    <p className="mt-2 text-sm text-muted-foreground break-all">
                      الكود المقروء: <code className="rounded bg-muted px-1.5 py-0.5">{scannedValue}</code>
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    تأكد أن الرمز يحتوي على كود المنتج (مثل G01) أو رابط صفحة المنتج من الموقع.
                  </p>
                </div>
              )}
              {!result && !error && !loading && (
                <p className="text-muted-foreground text-sm">
                  امسح رمز QR لعرض النتيجة هنا.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
