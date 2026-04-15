"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SummaryRow = { slug: string; sku: string | null; outQty: number; inQty: number; net: number };

export default function MovementsPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SummaryRow[]>([]);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gift-movements?month=${encodeURIComponent(month)}`, { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; error?: string; summary?: SummaryRow[] };
      if (res.ok && json.success && Array.isArray(json.summary)) {
        setRows(json.summary);
      } else if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/movements");
      } else {
        toast.error(json.error || "تعذر جلب سجل الحركة.");
      }
    } catch {
      toast.error("حدث خطأ أثناء جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authOk) void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authOk, month]);

  const totals = useMemo(() => {
    const out = rows.reduce((s, r) => s + (r.outQty || 0), 0);
    const inn = rows.reduce((s, r) => s + (r.inQty || 0), 0);
    return { out, in: inn, net: inn - out };
  }, [rows]);

  const exportCsv = () => {
    const escape = (t: string) =>
      t.includes(",") || t.includes("\n") || t.includes('"') ? `"${t.replace(/"/g, '""')}"` : t;
    const header = ["Slug", "SKU", "وارد", "صادر", "الصافي"];
    const lines = [
      header.map(escape).join(","),
      ...rows.map((r) =>
        [r.slug, r.sku ?? "", String(r.inQty ?? 0), String(r.outQty ?? 0), String(r.net ?? 0)].map(escape).join(",")
      ),
    ];
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gift-movements-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }
  if (authOk === false) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold">سجل الحركة (وارد / صادر)</h1>
              <p className="text-muted-foreground">تقرير شهري لتجميع الكميات حسب الهدية.</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="min-h-[44px] shrink-0">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  الشهر
                </CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    اختر الشهر:
                    <Input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="min-h-[44px] w-[170px]"
                    />
                  </label>
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={fetchData} disabled={loading}>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    {loading ? "جاري التحديث..." : "تحديث"}
                  </Button>
                  <Button type="button" className="min-h-[44px]" onClick={exportCsv} disabled={rows.length === 0}>
                    <Download className="ml-2 h-4 w-4" />
                    تصدير CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              الإجمالي — وارد: <span className="font-semibold text-foreground">{totals.in}</span>، صادر:{" "}
              <span className="font-semibold text-foreground">{totals.out}</span>، الصافي:{" "}
              <span className="font-semibold text-foreground">{totals.net}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الملخص</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              ) : rows.length === 0 ? (
                <p className="text-muted-foreground">لا توجد حركة مسجلة لهذا الشهر.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[640px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3">Slug</th>
                        <th className="p-3 w-24">SKU</th>
                        <th className="p-3 w-24">وارد</th>
                        <th className="p-3 w-24">صادر</th>
                        <th className="p-3 w-24">الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.slug} className="border-t">
                          <td className="p-3 break-all">{r.slug}</td>
                          <td className="p-3">{r.sku ?? "—"}</td>
                          <td className="p-3 tabular-nums">{r.inQty ?? 0}</td>
                          <td className="p-3 tabular-nums">{r.outQty ?? 0}</td>
                          <td className="p-3 tabular-nums">{r.net ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

