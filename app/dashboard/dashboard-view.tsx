"use client";
/** @jsxImportSource react */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Search, LogOut, Download, Upload, BarChart3, ClipboardList, FileText, QrCode, DownloadCloud, RefreshCw, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ProductForm } from "@/components/dashboard/product-form";
import { Product, getGiftTierLabel, products as initialProducts } from "@/data/products";
import { notifyProductsStorageChanged } from "@/lib/products-local-storage";
import { generateProductSlug } from "@/lib/slug";
import { getStoredOrders, saveStoredOrders, type OrderRecord } from "@/types/order";
import { getSiteOriginForShare, productPageUrl } from "@/lib/site-url";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardViewReturn } from "./dashboard-view-return";
import type { InputChangeEvent } from "./dashboard-types";

export function DashboardView() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);
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
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  const LOW_STOCK_THRESHOLD = 3;
  const lowStockProducts = products.filter(
    (p) => !p.archived && (p.availableQuantity ?? 0) <= LOW_STOCK_THRESHOLD
  );

  const refetchProducts = useCallback(async (quick = false) => {
    try {
      const qs = new URLSearchParams();
      if (quick) qs.set("quick", "1");
      qs.set("include_hidden", "1");
      qs.set("include_archived", "1");
      const res = await fetch(`/api/products?${qs.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
        if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(json.data));
        notifyProductsStorageChanged();
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refetchProducts(false);
    if (typeof window !== "undefined") {
      const n = parseInt(localStorage.getItem("visit_count") ?? "0", 10);
      setVisitCount(n);
      setOrders(getStoredOrders());
    }
  }, [refetchProducts]);

  const PRODUCTS_AUTO_REFRESH_MS = 45 * 1000;
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      void refetchProducts(true);
    }, PRODUCTS_AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [mounted, refetchProducts, PRODUCTS_AUTO_REFRESH_MS]);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  const handleFormSubmit = async (product: Partial<Product>) => {
    try {
      const isEdit = !!editingProduct?.slug;
      /** عند التعديل يجب إرسال slug الأصلي من القاعدة؛ النموذج لا يضمّن slug فيصل undefined وكان يُستبدل بـ product-timestamp فيفشل PUT */
      let slug: string;
      if (isEdit) {
        slug = (editingProduct?.slug || product.slug || "").trim();
        if (!slug) {
          alert("تعذر تحديد الهدية. أغلق النافذة وأعد فتح التعديل.");
          return;
        }
      } else {
        slug =
          (product.slug && product.slug.trim()) ||
          generateProductSlug(product.name ?? "") ||
          "product";
        const baseSlug = slug;
        let counter = 0;
        while (products.some((p) => p.slug === slug)) {
          counter++;
          slug = `${baseSlug}-${counter}`;
        }
      }
      const payload = {
        slug,
        sku: product.sku ?? "",
        name: product.name ?? "",
        shortDescription: product.shortDescription ?? "",
        contents: Array.isArray(product.contents) ? product.contents : [],
        giftTier: product.giftTier ?? "standard",
        images: Array.isArray(product.images) ? product.images : [],
        availableQuantity: product.availableQuantity ?? 0,
        category: product.category,
        price: product.price,
      };
      const response = await fetch("/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let result: { success?: boolean; error?: string; data?: Product } = {};
      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        alert(`رد غير صالح من الخادم (${response.status}). تحقق من الاتصال أو سجّل الدخول مجدداً.`);
        return;
      }
      if (result.success) {
        const saved = result.data;
        if (saved) {
          setProducts((prev) => {
            const next = isEdit
              ? prev.map((p) => (p.slug === slug ? saved : p))
              : [...prev, saved];
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("products", JSON.stringify(next));
                notifyProductsStorageChanged();
              }
            } catch {
              //
            }
            return next;
          });
        } else {
          await refetchProducts(true);
        }
        setIsFormOpen(false);
        setEditingProduct(null);
        return;
      }
      if (response.status === 401) {
        alert(result.error || "انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard");
        return;
      }
      alert(result.error || `تعذر الحفظ (${response.status})`);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleExportGiftsExcel = async () => {
    if (products.length === 0) {
      alert("لا توجد هدايا في القائمة.");
      return;
    }
    try {
      const { utils, writeFile } = await import("xlsx");
      const seen = new Set<string>();
      const rows = products
        .filter((p) => {
          if (!p?.slug) return false;
          if (seen.has(p.slug)) return false;
          seen.add(p.slug);
          return true;
        })
        .map((p) => {
          return {
            "كود المنتج": p.sku ?? "",
            "اسم المنتج": p.name ?? "",
            "التصنيف": p.category ?? "",
            "الكمية الحالية": p.availableQuantity ?? "",
          };
        });

      const ws = utils.json_to_sheet(rows, {
        header: [
          "كود المنتج",
          "اسم المنتج",
          "التصنيف",
          "الكمية الحالية",
        ],
        skipHeader: false,
      });

      ws["!cols"] = [
        { wch: 12 },
        { wch: 30 },
        { wch: 18 },
        { wch: 14 },
      ];

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "الهدايا");
      const filename = `تصدير-بيانات-الهدايا-${new Date().toISOString().slice(0, 10)}.xlsx`;
      writeFile(wb, filename);
    } catch (e) {
      console.error(e);
      alert("تعذر إنشاء ملف Excel. جرّب CSV كحل بديل.");
    }
  };

  const handleBackup = () => {
    const json = JSON.stringify(products, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `هدايا-نسخة-احتياطية-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: InputChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data) || data.length === 0) {
          alert("الملف يجب أن يحتوي على مصفوفة هدايا.");
          return;
        }
        const valid = data.every((p: unknown) => p && typeof p === "object" && "slug" in p && "name" in p && "sku" in p);
        if (!valid) {
          alert("صيغة الملف غير صحيحة. تأكد أنه نسخة احتياطية من الهدايا.");
          return;
        }
        if (!confirm(`سيتم استبدال ${products.length} هدية بـ ${data.length} هدية. متابعة؟`)) return;
        setProducts(data as Product[]);
        if (typeof window !== "undefined") {
          localStorage.setItem("products", JSON.stringify(data));
          notifyProductsStorageChanged();
        }
        alert("تمت الاستعادة بنجاح.");
      } catch {
        alert("تعذر قراءة الملف. تأكد أنه ملف JSON صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const orderSearchLower = orderSearchQuery.trim().toLowerCase();
  const ordersDisplayed = orderSearchLower
    ? ordersForPeriod.filter(
        (o) =>
          (o.id ?? "").toLowerCase().includes(orderSearchLower) ||
          (o.requesterName ?? "").toLowerCase().includes(orderSearchLower) ||
          (o.date ?? "").toLowerCase().includes(orderSearchLower) ||
          (o.notes ?? "").toLowerCase().includes(orderSearchLower) ||
          (o.items ?? []).some((it) => (it.name ?? "").toLowerCase().includes(orderSearchLower))
      )
    : ordersForPeriod;

  const last6Months = (() => {
    const out: { month: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({
        month: ym,
        label: d.toLocaleDateString("ar-SA", { month: "short", year: "numeric" }),
        count: orders.filter((o) => (o.date ?? o.createdAt ?? "").slice(0, 7) === ym).length,
      });
    }
    return out;
  })();
  const maxOrdersMonth = Math.max(1, ...last6Months.map((m) => m.count));
  const byRequester = (() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const r = (o.requesterName ?? "—").trim() || "—";
      map.set(r, (map.get(r) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  })();
  const maxByRequester = Math.max(1, ...byRequester.map((r) => r.count));

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الهدية؟")) return;
    try {
      const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.slug !== slug));
        await refetchProducts(true);
      } else {
        alert(result.error || "فشل الحذف");
      }
    } catch (e) {
      console.error(e);
      alert("فشل الحذف");
    }
  };

  const handleToggleHidden = async (slug: string, hidden: boolean) => {
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, hidden }),
      });
      const result = await response.json();
      if (result.success) {
        await refetchProducts(true);
        return;
      }
      if (response.status === 401) {
        alert(result.error || "انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard");
        return;
      }
      alert(result.error || "تعذر تحديث الإخفاء");
    } catch (e) {
      console.error(e);
      alert("تعذر تحديث الإخفاء");
    }
  };

  const extra = (
        <>
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
        </>
  );
  return React.createElement(DashboardViewReturn, {
    extra,
    products,
    searchQuery,
    setSearchQuery,
    isFormOpen,
    setIsFormOpen,
    editingProduct,
    setEditingProduct,
    visitCount,
    dashboardTab,
    setDashboardTab,
    orders,
    reportMonth,
    setReportMonth,
    reportType,
    setReportType,
    reportQuarter,
    setReportQuarter,
    reportYear,
    setReportYear,
    reportLoading,
    setReportLoading,
    orderSearchQuery,
    setOrderSearchQuery,
    lowStockProducts,
    LOW_STOCK_THRESHOLD,
    ordersForPeriod,
    periodLabel,
    ordersDisplayed,
    last6Months,
    maxOrdersMonth,
    byRequester,
    maxByRequester,
    filteredProducts,
    handleAddProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleToggleHidden,
    handleFormSubmit,
    handleExportGiftsExcel,
    handleBackup,
    handleRestore,
    handleDownloadReport,
    refreshOrders,
    refetchProducts,
    handleLogout,
  });
}
