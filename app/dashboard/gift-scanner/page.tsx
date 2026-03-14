"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/qr-scanner";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export interface ScanResponse {
  status: string;
  gift_name: string;
  remaining_quantity: number;
}

export default function GiftScannerPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const handleScan = async (decodedText: string) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gifts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code: decodedText.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        setResult({
          status: data.status,
          gift_name: data.gift_name ?? "",
          remaining_quantity: data.remaining_quantity ?? 0,
        });
      } else {
        setError(data.error ?? "QR Code not found in the system");
      }
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
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
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <p className="text-muted-foreground">جاري التسجيل...</p>
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
                </div>
              )}
              {error && !loading && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-right text-destructive">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
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
