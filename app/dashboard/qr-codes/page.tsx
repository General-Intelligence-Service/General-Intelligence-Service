"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Download, DownloadCloud } from "lucide-react";
import { products as initialProducts } from "@/data/products";

const QR_IMAGE_API = "https://api.qrserver.com/v1/create-qr-code";

export default function QRCodesPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const downloadOne = (sku: string) => {
    const url = `${QR_IMAGE_API}/?size=200x200&data=${encodeURIComponent(sku)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sku}.png`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      for (const p of initialProducts) {
        const url = `${QR_IMAGE_API}/?size=200x200&data=${encodeURIComponent(p.sku)}`;
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(`${p.sku}.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `qr-codes-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingAll(false);
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
              <h1 className="mb-2 text-3xl font-bold">تحميل رموز QR للهدايا</h1>
              <p className="text-muted-foreground">
                حمّل صورة QR تحتوي على كود كل هدية (اسم الملف: رقم الكود) ثم اطبعها والصقها على العبوات.
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
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">الهدايا</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    تحميل كل صورة لوحدها أو تحميل الكل معاً (ملف ZIP).
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={downloadAll}
                  disabled={downloadingAll || initialProducts.length === 0}
                  className="min-h-[44px] shrink-0"
                >
                  <DownloadCloud className="ml-2 h-5 w-5" />
                  {downloadingAll ? "جاري التحميل..." : "تحميل الكل (ZIP)"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {initialProducts.map((p) => (
                  <li key={p.sku} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                    <div className="min-w-0">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground text-sm mr-2"> — {p.sku}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 min-h-[44px]"
                      onClick={() => downloadOne(p.sku)}
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تحميل ({p.sku})
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
