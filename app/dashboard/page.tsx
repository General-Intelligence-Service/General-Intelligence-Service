"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Package, Search, LogOut, Download, Upload, BarChart3, ClipboardList, FileText, QrCode, DownloadCloud, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ProductForm } from "@/components/dashboard/product-form";
import { Product, type GiftTier, getGiftTierLabel, generateNextSKU, products as initialProducts } from "@/data/products";
import { getStoredOrders, saveStoredOrders, type OrderRecord } from "@/types/order";

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [dashboardTab, setDashboardTab] = useState<"products" | "orders">("products");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportType, setReportType] = useState<"month" | "quarter" | "year">("month");
  const [reportQuarter, setReportQuarter] = useState<string>(() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()}-${q}`;
  });
  const [reportYear, setReportYear] = useState<string>(() => String(new Date().getFullYear()));
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) setAuthOk(true);
        else setAuthOk(false);
      })
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const refetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
        if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(json.data));
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refetchProducts();
    if (typeof window !== "undefined") {
      const n = parseInt(localStorage.getItem("visit_count") ?? "0", 10);
      setVisitCount(n);
      setOrders(getStoredOrders());
    }
  }, [refetchProducts]);

  const ordersForMonth = orders.filter((o) => {
    const ym = o.date ? o.date.slice(0, 7) : o.createdAt?.slice(0, 7);
    return ym === reportMonth;
  });

  const monthLabel = (() => {
    const [y, m] = reportMonth.split("-");
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
  })();

  const quarterLabels = ["الأول", "الثاني", "الثالث", "الرابع"];

  const { ordersForPeriod, periodLabel, reportSubtitle, downloadFilename } = (() => {
    if (reportType === "month") {
      return {
        ordersForPeriod: ordersForMonth,
        periodLabel: monthLabel,
        reportSubtitle: "تقرير الطلبات الشهري",
        downloadFilename: `تقرير-طلبات-${reportMonth}.pdf`,
      };
    }
    if (reportType === "quarter") {
      const [y, q] = reportQuarter.split("-").map(Number);
      const startMonth = (q - 1) * 3 + 1;
      const monthPrefixes = [
        `${y}-${String(startMonth).padStart(2, "0")}`,
        `${y}-${String(startMonth + 1).padStart(2, "0")}`,
        `${y}-${String(startMonth + 2).padStart(2, "0")}`,
      ];
      const ordersForPeriod = orders.filter((o) => {
        const ym = o.date ? o.date.slice(0, 7) : o.createdAt?.slice(0, 7);
        return ym && monthPrefixes.includes(ym);
      });
      const label = `الربع ${quarterLabels[(q || 1) - 1]} ${y}`;
      return {
        ordersForPeriod,
        periodLabel: label,
        reportSubtitle: "تقرير الطلبات الربع سنوي",
        downloadFilename: `تقرير-طلبات-ربع-${y}-${q}.pdf`,
      };
    }
    const y = reportYear;
    const ordersForPeriod = orders.filter((o) => {
      const ym = o.date ? o.date.slice(0, 4) : o.createdAt?.slice(0, 4);
      return ym === y;
    });
    return {
      ordersForPeriod,
      periodLabel: y,
      reportSubtitle: "تقرير الطلبات السنوي",
      downloadFilename: `تقرير-طلبات-${y}.pdf`,
    };
  })();

  const handleDownloadReport = async () => {
    if (ordersForPeriod.length === 0) {
      alert("لا توجد طلبات في الفترة المحددة.");
      return;
    }
    setReportLoading(true);
    try {
      const { generateMonthlyReportBlob } = await import("@/lib/monthly-report-pdf");
      const blob = await generateMonthlyReportBlob(ordersForPeriod, periodLabel, reportSubtitle);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إنشاء التقرير.");
    } finally {
      setReportLoading(false);
    }
  };

  const refreshOrders = () => setOrders(getStoredOrders());

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("products", JSON.stringify(products));
    }
  }, [products, mounted]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        const refetch = await fetch("/api/products");
        const refetchJson = await refetch.json();
        if (refetchJson.success && Array.isArray(refetchJson.data)) {
          setProducts(refetchJson.data);
          if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(refetchJson.data));
        } else {
          setProducts(products.filter((p) => p.slug !== slug));
        }
      } else {
        alert(result.error ?? "فشل في حذف المنتج");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("حدث خطأ أثناء حذف المنتج");
    }
  };

  const handleFormSubmit = async (productData: Partial<Product>) => {
    try {
      if (!editingProduct && !productData.sku) {
        productData.sku = generateNextSKU();
      }

      const generateSlug = (name: string): string => {
        let slug = name
          .trim()
          .toLowerCase()
          .replace(/[\s\u200C\u200D\u200E\u200F\u202A-\u202E]+/g, "-")
          .replace(/[^\w\u0600-\u06FF-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slug) slug = `product-${Date.now()}`;
        return slug;
      };

      if (!productData.slug && productData.name) {
        let baseSlug = generateSlug(productData.name);
        let slug = baseSlug;
        let counter = 1;
        const allProductsToCheck = [...products, ...initialProducts];
        while (allProductsToCheck.some((p) => p.slug === slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        productData.slug = slug;
      }

      const method = editingProduct ? "PUT" : "POST";
      const response = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct ? { ...editingProduct, ...productData } : productData),
      });
      const result = await response.json();

      if (result.success) {
        const refetch = await fetch("/api/products");
        const refetchJson = await refetch.json();
        if (refetchJson.success && Array.isArray(refetchJson.data)) {
          setProducts(refetchJson.data);
          if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(refetchJson.data));
        } else if (editingProduct) {
          setProducts(products.map((p) => (p.slug === editingProduct.slug ? ({ ...p, ...productData } as Product) : p)));
        } else {
          const newProduct: Product = {
            slug: productData.slug!,
            sku: productData.sku!,
            name: productData.name!,
            shortDescription: productData.shortDescription!,
            contents: productData.contents || [],
            giftTier: productData.giftTier!,
            images: productData.images || [],
            availableQuantity: productData.availableQuantity || 0,
            category: productData.category,
            price: productData.price,
          };
          setProducts([...products, newProduct]);
        }
        setIsFormOpen(false);
        setEditingProduct(null);
      } else {
        alert(result.error ?? "فشل في حفظ المنتج");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("حدث خطأ أثناء حفظ المنتج");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  };

  const escapeCsv = (s: string | number) => {
    const t = String(s ?? "").replace(/"/g, '""');
    return t.includes(",") || t.includes("\n") || t.includes('"') ? `"${t}"` : t;
  };

  const handleExportCSV = () => {
    const headers = ["الاسم", "الكود", "التصنيف", "الفئة", "السعر", "الوصف"];
    const rows = products.map((p) => [
      p.name,
      p.sku,
      getGiftTierLabel(p.giftTier),
      p.category ?? "",
      p.price ?? "",
      (p.shortDescription ?? "").replace(/\s+/g, " "),
    ]);
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `منتجات-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = () => {
    const json = JSON.stringify(products, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `منتجات-نسخة-احتياطية-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data) || data.length === 0) {
          alert("الملف يجب أن يحتوي على مصفوفة منتجات.");
          return;
        }
        const valid = data.every((p: unknown) => p && typeof p === "object" && "slug" in p && "name" in p && "sku" in p);
        if (!valid) {
          alert("صيغة الملف غير صحيحة. تأكد أنه نسخة احتياطية من المنتجات.");
          return;
        }
        if (!confirm(`سيتم استبدال ${products.length} منتج بـ ${data.length} منتج. متابعة؟`)) return;
        setProducts(data as Product[]);
        if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(data));
        alert("تمت الاستعادة بنجاح.");
      } catch {
        alert("تعذر قراءة الملف. تأكد أنه ملف JSON صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
      <main className="flex-1 bg-muted/30 min-h-screen">
        <div className="container mx-auto max-w-full overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8 pb-safe">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-bold sm:mb-2 sm:text-3xl">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground sm:text-base">إدارة المنتجات والهدايا المعروضة</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
              <Link href="/dashboard/gift-scanner" className="min-w-0">
                <Button variant="outline" size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto">
                  <QrCode className="ml-2 h-5 w-5 shrink-0" />
                  <span className="truncate">مسح الهدايا</span>
                </Button>
              </Link>
              <Link href="/dashboard/qr-codes" className="min-w-0">
                <Button variant="outline" size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto">
                  <DownloadCloud className="ml-2 h-5 w-5 shrink-0" />
                  <span className="truncate">رموز QR</span>
                </Button>
              </Link>
              <Button onClick={handleAddProduct} size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto col-span-2 sm:col-span-1">
                <Plus className="ml-2 h-5 w-5 shrink-0" />
                إضافة منتج جديد
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout} title="تسجيل الخروج" className="min-h-[44px] min-w-[44px] touch-manipulation col-span-2 sm:col-span-1">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">تسجيل الخروج</span>
              </Button>
            </div>
          </div>

          {/* ملخص سريع + أكثر المنتجات طلباً */}
          {(() => {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const thisMonthOrders = orders.filter((o) => {
              const ym = o.date ? o.date.slice(0, 7) : o.createdAt?.slice(0, 7);
              return ym === currentMonth;
            });
            const thisMonthPieces = thisMonthOrders.reduce((s, o) => s + (o.totalPieces ?? 0), 0);
            return (
              <>
                <Card className="mb-6 border-primary/20 bg-primary/5">
                  <CardContent className="flex flex-row flex-wrap items-center justify-around gap-4 px-4 py-5 sm:px-6 sm:py-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">طلبات هذا الشهر</p>
                      <p className="text-2xl font-bold text-primary">{thisMonthOrders.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">إجمالي القطع هذا الشهر</p>
                      <p className="text-2xl font-bold text-primary">{thisMonthPieces}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}

          <div className="mb-6 flex border-b">
            <button
              type="button"
              onClick={() => setDashboardTab("products")}
              className={`flex-1 min-h-[44px] px-4 py-2 font-medium transition-colors touch-manipulation flex items-center justify-center ${dashboardTab === "products" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              المنتجات
            </button>
            <button
              type="button"
              onClick={() => { setDashboardTab("orders"); refreshOrders(); }}
              className={`flex-1 min-h-[44px] px-4 py-2 font-medium transition-colors touch-manipulation flex items-center justify-center gap-1 ${dashboardTab === "orders" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              الطلبات
            </button>
          </div>

          {dashboardTab === "orders" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  الطلبات المسجلة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as "month" | "quarter" | "year")}
                    className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto sm:min-w-[120px]"
                  >
                    <option value="month">شهري</option>
                    <option value="quarter">ربع سنوي</option>
                    <option value="year">سنوي</option>
                  </select>
                  {reportType === "month" && (
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">الشهر:</span>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto"
                      />
                    </label>
                  )}
                  {reportType === "quarter" && (
                    <>
                      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                        <span className="text-sm text-muted-foreground">السنة:</span>
                        <input
                          type="number"
                          min={2020}
                          max={2030}
                          value={reportQuarter.split("-")[0]}
                          onChange={(e) => setReportQuarter(`${e.target.value}-${reportQuarter.split("-")[1] || 1}`)}
                          className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-24"
                        />
                      </label>
                      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                        <span className="text-sm text-muted-foreground">الربع:</span>
                        <select
                          value={reportQuarter.split("-")[1]}
                          onChange={(e) => setReportQuarter(`${reportQuarter.split("-")[0]}-${e.target.value}`)}
                          className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto"
                        >
                          <option value="1">الأول (يناير–مارس)</option>
                          <option value="2">الثاني (أبريل–يونيو)</option>
                          <option value="3">الثالث (يوليو–سبتمبر)</option>
                          <option value="4">الرابع (أكتوبر–ديسمبر)</option>
                        </select>
                      </label>
                    </>
                  )}
                  {reportType === "year" && (
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">السنة:</span>
                      <input
                        type="number"
                        min={2020}
                        max={2030}
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-24"
                      />
                    </label>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="min-h-[44px] w-full sm:w-auto touch-manipulation"
                    onClick={handleDownloadReport}
                    disabled={ordersForPeriod.length === 0 || reportLoading}
                  >
                    <FileText className="ml-2 h-4 w-4" />
                    {reportLoading ? "جاري التصدير..." : "تحميل تقرير PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] touch-manipulation"
                    onClick={() => {
                      const rows = ordersForPeriod.map((o, i) => {
                        const gifts = (o.items ?? []).map((it) => `${it.name} (${it.quantity})`).join(" - ");
                        return [i + 1, o.date ?? "", o.requesterName ?? "", gifts, o.totalPieces ?? 0, (o.notes ?? "").replace(/\s+/g, " ")];
                      });
                      const header = ["رقم", "التاريخ", "الجهة الطالبة", "الهدايا", "القطع", "ملاحظات"];
                      const csv = "\uFEFF" + [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `طلبات-${periodLabel.replace(/\s+/g, "-")}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={ordersForPeriod.length === 0}
                  >
                    <Download className="ml-2 h-4 w-4" />
                    تصدير CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] touch-manipulation"
                    onClick={() => {
                      const data = getStoredOrders();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `orders-backup-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="ml-2 h-4 w-4" />
                    تصدير نسخة احتياطية
                  </Button>
                  <label className="inline-flex cursor-pointer min-h-[44px]">
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const raw = reader.result as string;
                            const parsed = JSON.parse(raw) as OrderRecord[];
                            if (!Array.isArray(parsed)) { alert("الملف يجب أن يحتوي مصفوفة طلبات."); return; }
                            if (!confirm(`سيتم استبدال ${orders.length} طلبية حالية بـ ${parsed.length} طلبية من الملف. متابعة؟`)) return;
                            saveStoredOrders(parsed);
                            setOrders(parsed);
                          } catch {
                            alert("ملف غير صالح. تأكد أن الملف نسخة احتياطية صحيحة.");
                          }
                          e.target.value = "";
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer min-h-[44px]">
                      <Upload className="ml-2 h-4 w-4" />
                      استعادة من نسخة
                    </span>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  عدد الطلبات في {periodLabel}: {ordersForPeriod.length} — إجمالي القطع: {ordersForPeriod.reduce((s, o) => s + (o.totalPieces ?? 0), 0)}
                </p>
                <div className="overflow-x-auto rounded-md border -mx-3 sm:mx-0 overflow-y-visible" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[640px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 sm:p-3 w-10">#</th>
                        <th className="p-2 sm:p-3 w-28">التاريخ</th>
                        <th className="p-2 sm:p-3 min-w-[120px]">الجهة الطالبة</th>
                        <th className="p-2 sm:p-3 min-w-[180px]">الهدايا</th>
                        <th className="p-2 sm:p-3 w-16">القطع</th>
                        <th className="p-2 sm:p-3 max-w-[160px]">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersForPeriod.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">لا توجد طلبات في الفترة المحددة</td></tr>
                      ) : (
                        ordersForPeriod.map((o, i) => {
                          const isToday = o.date === new Date().toISOString().slice(0, 10);
                          const isThisMonth = (o.date?.slice(0, 7) ?? o.createdAt?.slice(0, 7)) === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                          return (
                          <tr
                            key={o.id}
                            className={`border-t align-top ${isToday ? "bg-green-50 dark:bg-green-950/20" : isThisMonth ? "bg-primary/5" : ""}`}
                          >
                            <td className="p-2 sm:p-3">{i + 1}</td>
                            <td className="p-2 sm:p-3">
                              <span className="inline-block">{o.date}</span>
                              {isToday && <Badge variant="default" className="mr-1 text-xs bg-green-600">اليوم</Badge>}
                              {!isToday && isThisMonth && <Badge variant="secondary" className="mr-1 text-xs">هذا الشهر</Badge>}
                            </td>
                            <td className="p-2 sm:p-3">{o.requesterName || "—"}</td>
                            <td className="p-2 sm:p-3">
                              {o.items?.length ? (
                                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                                  {o.items.map((it, idx) => (
                                    <li key={idx}>{it.name} ({it.quantity})</li>
                                  ))}
                                </ul>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-2 sm:p-3">{o.totalPieces ?? 0}</td>
                            <td className="p-2 sm:p-3 max-w-[160px] truncate">{o.notes || "—"}</td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {dashboardTab === "products" && (
          <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                إحصائيات وأدوات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">عدد المنتجات:</span>
                  <span className="mr-2 font-bold text-lg">{products.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">عدد زيارات الصفحة الرئيسية:</span>
                  <span className="mr-2 font-bold text-lg">{visitCount}</span>
                  <span className="text-muted-foreground text-xs">(هذا المتصفح)</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={refetchProducts} title="تحديث الأعداد من قاعدة البيانات (بعد مسح الهدايا)">
                  <RefreshCw className="ml-2 h-4 w-4" />
                  تحديث القائمة
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={handleExportCSV}>
                  <Download className="ml-2 h-4 w-4" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={handleBackup}>
                  <Download className="ml-2 h-4 w-4" />
                  تحميل نسخة احتياطية
                </Button>
                <label className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] px-4 cursor-pointer touch-manipulation">
                  <Upload className="ml-2 h-4 w-4" />
                  استعادة من ملف
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleRestore} />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="ابحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 min-h-[44px] text-base touch-manipulation"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.slug} className="overflow-hidden break-inside-avoid">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2 text-xl">{product.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">كود: {product.sku}</Badge>
                        <Badge variant="outline">العدد: {product.availableQuantity ?? 0}</Badge>
                        <Badge
                          variant={product.giftTier === "luxury" ? "default" : "outline"}
                          className={product.giftTier === "luxury" ? "bg-brand-gold text-white" : ""}
                        >
                          {getGiftTierLabel(product.giftTier)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {product.shortDescription}
                  </p>
                  <div className="mb-4 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">المحتويات:</span>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {product.contents.slice(0, 3).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                        {product.contents.length > 3 && (
                          <li className="text-xs">+{product.contents.length - 3} أكثر</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 min-h-[44px] touch-manipulation" onClick={() => handleEditProduct(product)}>
                      <Edit className="ml-2 h-4 w-4 shrink-0" />
                      تعديل
                    </Button>
                    <Button variant="destructive" className="flex-1 min-h-[44px] touch-manipulation" onClick={() => handleDeleteProduct(product.slug)}>
                      <Trash2 className="ml-2 h-4 w-4 shrink-0" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {searchQuery ? "لم يتم العثور على منتجات تطابق البحث" : "لا توجد منتجات"}
              </p>
            </div>
          )}
          </>
          )}
        </div>
      </main>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      <Footer />
    </div>
  );
}
