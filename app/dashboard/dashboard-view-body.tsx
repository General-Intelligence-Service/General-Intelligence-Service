"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SecurityAlerts } from "@/components/dashboard/security-alerts";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Upload,
  BarChart3,
  ClipboardList,
  FileText,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Printer,
  Eye,
  EyeOff,
  Sheet,
  ChevronDown,
  LayoutGrid,
  List,
  Minus,
  Package,
  Boxes,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Product,
  getGiftTierLabel,
  type GiftTier,
} from "@/data/products";
import { getStoredOrders, saveStoredOrders, type OrderRecord } from "@/types/order";
import type { DashboardViewReturnProps } from "./dashboard-view-return";
import { productPageUrl } from "@/lib/site-url";
import { siteConfig } from "@/lib/config";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { ProductImageThumb } from "@/components/image-lightbox";

type StockFilter = "all" | "in_stock" | "low" | "out";
type TierFilter = "all" | GiftTier;
type ViewMode = "table" | "grid";
type AlertFilter = null | "out" | "low";

function stockStatus(qty: number): "out" | "low" | "ok" {
  if (qty <= 0) return "out";
  if (qty <= 3) return "low";
  return "ok";
}

function StockDot({ status }: { status: "out" | "low" | "ok" }) {
  const label = status === "out" ? "نفد" : status === "low" ? "منخفض" : "متوفر";
  const color =
    status === "out" ? "bg-red-500" : status === "low" ? "bg-orange-500" : "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: GiftTier }) {
  if (tier === "luxury") {
    return <Badge className="bg-brand-gold text-white border-transparent">{getGiftTierLabel(tier)}</Badge>;
  }
  if (tier === "premium") {
    return (
      <Badge variant="outline" className="border-brand-green-dark/40 text-brand-green-dark dark:text-brand-gold-light">
        {getGiftTierLabel(tier)}
      </Badge>
    );
  }
  return <Badge variant="secondary">{getGiftTierLabel(tier)}</Badge>;
}

export function DashboardViewBody(props: DashboardViewReturnProps) {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const {
    products,
    searchQuery,
    setSearchQuery,
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
    orderSearchQuery,
    setOrderSearchQuery,
    visitCount,
    LOW_STOCK_THRESHOLD,
    ordersForPeriod,
    periodLabel,
    ordersDisplayed,
    last6Months,
    maxOrdersMonth,
    byRequester,
    maxByRequester,
    handleAddProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleToggleHidden,
    handleQuickQuantity,
    handleExportGiftsExcel,
    handleImportGiftsExcel,
    giftsExcelImporting,
    handleBackup,
    parseRestoreFile,
    applyRestoreProducts,
    handleDownloadReport,
    refreshOrders,
    refetchProducts,
  } = props;

  const [siteOrigin, setSiteOrigin] = useState("");
  const [catalogPdfLoading, setCatalogPdfLoading] = useState(false);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>(null);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restorePending, setRestorePending] = useState<Product[] | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setSiteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setViewMode(mq.matches ? "table" : "grid");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (searchParams.get("focus") === "backup") {
      setDashboardTab("products");
      setToolsOpen(true);
    }
  }, [searchParams, setDashboardTab]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToolsOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  const handleDownloadCatalogPdfQtyQr = async () => {
    if (catalogPdfLoading) return;
    if (products.length === 0) {
      notifyInfo("لا توجد هدايا في القائمة.");
      return;
    }
    setCatalogPdfLoading(true);
    try {
      const { downloadFullCatalogWithQuantityAndQr } = await import("@/lib/catalog-pdf");
      await downloadFullCatalogWithQuantityAndQr(products, siteConfig);
      notifySuccess("تم تنزيل كتالوج PDF.");
    } catch (e) {
      console.error(e);
      notifyError("تعذر إنشاء كتالوج PDF. تحقق من الاتصال أو حاول لاحقاً.");
    } finally {
      setCatalogPdfLoading(false);
      setToolsOpen(false);
    }
  };

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonthOrders = orders.filter((o) => {
    const ym = o.date ? o.date.slice(0, 7) : o.createdAt?.slice(0, 7);
    return ym === currentMonth;
  });
  const thisMonthPieces = thisMonthOrders.reduce((s, o) => s + (o.totalPieces ?? 0), 0);
  const totalStockPieces = products.reduce((s, p) => s + (p.availableQuantity ?? 0), 0);

  const outOfStockCount = products.filter((p) => !p.archived && (p.availableQuantity ?? 0) <= 0).length;
  const lowStockCount = products.filter((p) => {
    const q = p.availableQuantity ?? 0;
    return !p.archived && q >= 1 && q <= LOW_STOCK_THRESHOLD;
  }).length;
  const hasAlerts = outOfStockCount > 0 || lowStockCount > 0;

  const displayedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (tierFilter !== "all" && p.giftTier !== tierFilter) return false;

      const qty = p.availableQuantity ?? 0;
      const status = stockStatus(qty);

      if (alertFilter === "out" && status !== "out") return false;
      if (alertFilter === "low" && status !== "low") return false;

      if (!alertFilter) {
        if (stockFilter === "in_stock" && status !== "ok") return false;
        if (stockFilter === "low" && status !== "low") return false;
        if (stockFilter === "out" && status !== "out") return false;
      }
      return true;
    });
  }, [products, searchQuery, tierFilter, stockFilter, alertFilter, LOW_STOCK_THRESHOLD]);

  const onRestoreFile = async (file: File | undefined) => {
    if (!file || !parseRestoreFile) return;
    const data = await parseRestoreFile(file);
    if (!data) return;
    setRestoreConfirmText("");
    setRestorePending(data);
    setToolsOpen(false);
  };

  const confirmRestore = () => {
    if (!restorePending || !applyRestoreProducts) return;
    if (restoreConfirmText.trim() !== "استعادة") return;
    applyRestoreProducts(restorePending);
    setRestorePending(null);
    setRestoreConfirmText("");
  };

  const chip = (active: boolean) =>
    cn(
      "min-h-[36px] rounded-full px-3 text-sm transition",
      active
        ? "bg-brand-green-dark text-white dark:bg-brand-gold dark:text-brand-green-darker"
        : "bg-white text-muted-foreground border border-border hover:text-foreground dark:bg-card"
    );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <h1 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light sm:text-3xl">
            {dashboardTab === "orders" ? "الطلبات" : "الهدايا"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dashboardTab === "orders" ? "متابعة الطلبات والتقارير" : "إدارة الهدايا والمخزون المعروض"}
          </p>
        </div>
        {dashboardTab === "products" && (
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/dashboard/gift-scanner" title="مسح QR">
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 border-border bg-white dark:bg-card">
                <QrCode className="h-5 w-5" />
                <span className="sr-only">مسح QR</span>
              </Button>
            </Link>
            <Button
              type="button"
              onClick={handleAddProduct}
              className="min-h-[44px] bg-brand-green-dark hover:bg-brand-green-darker"
            >
              <Plus className="ml-2 h-5 w-5" />
              <span className="hidden sm:inline">إضافة هدية جديدة</span>
              <span className="sm:hidden">إضافة</span>
            </Button>
          </div>
        )}
      </div>

      {dashboardTab === "products" && <SecurityAlerts />}

      {/* Stats — products tab */}
      {dashboardTab === "products" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "عدد الهدايا",
                value: products.length,
                sub: null as string | null,
                icon: Package,
                tone: "bg-brand-green-dark/10 text-brand-green-dark dark:text-brand-gold-light",
              },
              {
                label: "إجمالي القطع في المخزون",
                value: totalStockPieces,
                sub: null,
                icon: Boxes,
                tone: "bg-brand-gold/20 text-brand-green-dark dark:text-brand-gold-light",
              },
              {
                label: "طلبات هذا الشهر",
                value: thisMonthOrders.length,
                sub: `${thisMonthPieces} قطعة`,
                icon: ShoppingBag,
                tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
              },
              {
                label: "زيارات الصفحة الرئيسية",
                value: visitCount,
                sub: "هذا المتصفح",
                icon: Users,
                tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm dark:bg-card">
                <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full", s.tone)}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                {s.sub && <p className="text-xs text-muted-foreground/80">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Compact stock alerts */}
          {hasAlerts && (
            <div className="rounded-xl border bg-white shadow-sm dark:bg-card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right"
                onClick={() => setAlertsOpen((o) => !o)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  تنبيهات المخزون
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", alertsOpen && "rotate-180")} />
              </button>
              {alertsOpen && (
                <div className="space-y-2 border-t px-4 py-3">
                  {outOfStockCount > 0 && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        🔴 نفدت الكمية: <strong className="tabular-nums">{outOfStockCount}</strong> هدايا
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[36px]"
                        onClick={() => {
                          setAlertFilter("out");
                          setStockFilter("all");
                        }}
                      >
                        عرض
                      </Button>
                    </div>
                  )}
                  {lowStockCount > 0 && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        🟠 كمية منخفضة: <strong className="tabular-nums">{lowStockCount}</strong> هدايا
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[36px]"
                        onClick={() => {
                          setAlertFilter("low");
                          setStockFilter("all");
                        }}
                      >
                        عرض
                      </Button>
                    </div>
                  )}
                  {alertFilter && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => setAlertFilter(null)}
                    >
                      إلغاء فلتر التنبيه
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-card space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن هدية بالاسم أو الكود..."
                  className="min-h-[44px] pr-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  title="تحديث القائمة"
                  onClick={() => void refetchProducts(false)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="flex rounded-full border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    title="جدول"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full",
                      viewMode === "table" ? "bg-brand-green-dark text-white dark:bg-brand-gold dark:text-brand-green-darker" : "text-muted-foreground"
                    )}
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="شبكة"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full",
                      viewMode === "grid" ? "bg-brand-green-dark text-white dark:bg-brand-gold dark:text-brand-green-darker" : "text-muted-foreground"
                    )}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative" ref={toolsRef}>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[40px]"
                    onClick={() => setToolsOpen((o) => !o)}
                  >
                    أدوات
                    <ChevronDown className={cn("mr-2 h-4 w-4 transition", toolsOpen && "rotate-180")} />
                  </Button>
                  {toolsOpen && (
                    <div className="absolute left-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border bg-white p-1 shadow-lg dark:bg-card">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
                        onClick={() => {
                          void handleExportGiftsExcel?.();
                          setToolsOpen(false);
                        }}
                      >
                        <Sheet className="h-4 w-4" /> تصدير بيانات الهدايا (Excel)
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted disabled:opacity-50"
                        disabled={giftsExcelImporting}
                        onClick={() => excelInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {giftsExcelImporting ? "جاري الاستيراد..." : "استيراد Excel (الكميات)"}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted disabled:opacity-50"
                        disabled={catalogPdfLoading}
                        onClick={() => void handleDownloadCatalogPdfQtyQr()}
                      >
                        <Printer className="h-4 w-4" />
                        {catalogPdfLoading ? "جاري إنشاء PDF..." : "كتالوج PDF (الكمية + QR)"}
                      </button>
                      <div className="my-1 border-t" />
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
                        onClick={() => {
                          handleBackup();
                          setToolsOpen(false);
                          notifySuccess("تم تنزيل النسخة الاحتياطية.");
                        }}
                      >
                        <Download className="h-4 w-4" /> تحميل نسخة احتياطية
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => restoreInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" /> استعادة من ملف
                      </button>
                    </div>
                  )}
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    disabled={giftsExcelImporting}
                    onChange={(ev) => {
                      if (handleImportGiftsExcel) void Promise.resolve(handleImportGiftsExcel(ev));
                      setToolsOpen(false);
                    }}
                  />
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      ev.target.value = "";
                      void onRestoreFile(file);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "الكل"],
                    ["standard", "قياسية"],
                    ["premium", "مميزة"],
                    ["luxury", "فاخرة"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={chip(tierFilter === id && !alertFilter)}
                    onClick={() => {
                      setTierFilter(id);
                      setAlertFilter(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "المخزون: الكل"],
                    ["in_stock", "متوفر"],
                    ["low", "منخفض"],
                    ["out", "نفد"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={chip(stockFilter === id && !alertFilter)}
                    onClick={() => {
                      setStockFilter(id);
                      setAlertFilter(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products list */}
          {displayedProducts.length === 0 ? (
            <div className="rounded-xl border bg-white py-14 text-center dark:bg-card">
              <p className="text-muted-foreground">
                {searchQuery || tierFilter !== "all" || stockFilter !== "all" || alertFilter
                  ? "لا توجد نتائج مطابقة"
                  : "لا توجد هدايا"}
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-card md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="px-3 py-3 text-right font-medium w-16">صورة</th>
                      <th className="px-3 py-3 text-right font-medium">الاسم</th>
                      <th className="px-3 py-3 text-right font-medium">التصنيف</th>
                      <th className="px-3 py-3 text-right font-medium">الكمية</th>
                      <th className="px-3 py-3 text-right font-medium">الحالة</th>
                      <th className="px-3 py-3 text-right font-medium">الظهور</th>
                      <th className="px-3 py-3 text-right font-medium">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.map((product) => {
                      const qty = product.availableQuantity ?? 0;
                      const status = stockStatus(qty);
                      return (
                        <tr key={product.slug} className="border-b last:border-0 transition hover:bg-muted/30">
                          <td className="px-3 py-3">
                            <ProductImageThumb
                              images={product.images ?? []}
                              name={product.name}
                              sku={product.sku}
                              sizeClassName="h-12 w-12"
                              sizes="48px"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium leading-snug">{product.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{product.sku}</p>
                          </td>
                          <td className="px-3 py-3">
                            <TierBadge tier={product.giftTier} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-0.5">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                                title="إنقاص"
                                onClick={() => void handleQuickQuantity?.(product.slug, qty - 1)}
                                disabled={qty <= 0}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-[2rem] text-center tabular-nums font-semibold">{qty}</span>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                                title="زيادة"
                                onClick={() => void handleQuickQuantity?.(product.slug, qty + 1)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StockDot status={status} />
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">
                            {product.hidden ? "مخفي" : "ظاهر"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-0.5">
                              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="تعديل" onClick={() => handleEditProduct(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <a
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                  siteOrigin ? productPageUrl(siteOrigin, product.slug) : product.sku
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                                title="QR"
                              >
                                <QrCode className="h-4 w-4" />
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                title={product.hidden ? "إظهار" : "إخفاء"}
                                onClick={() => void handleToggleHidden?.(product.slug, !product.hidden)}
                              >
                                {product.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive"
                                title="حذف"
                                onClick={() => void handleDeleteProduct(product.slug)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Mobile / grid cards */}
          <div className={cn("grid gap-3", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:hidden")}>
            {displayedProducts.map((product) => {
              const qty = product.availableQuantity ?? 0;
              const status = stockStatus(qty);
              return (
                <div key={product.slug} className="rounded-xl border bg-white p-3 shadow-sm dark:bg-card">
                  <div className="flex gap-3">
                    <ProductImageThumb
                      images={product.images ?? []}
                      name={product.name}
                      sku={product.sku}
                      sizeClassName="h-14 w-14 shrink-0 rounded-lg"
                      sizes="56px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <TierBadge tier={product.giftTier} />
                        <StockDot status={status} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-lg border p-0.5">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                        onClick={() => void handleQuickQuantity?.(product.slug, qty - 1)}
                        disabled={qty <= 0}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2rem] text-center tabular-nums font-semibold">{qty}</span>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                        onClick={() => void handleQuickQuantity?.(product.slug, qty + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10" title="تعديل" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        title={product.hidden ? "إظهار" : "إخفاء"}
                        onClick={() => void handleToggleHidden?.(product.slug, !product.hidden)}
                      >
                        {product.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        title="حذف"
                        onClick={() => void handleDeleteProduct(product.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Orders tab — same logic, cleaner chrome */}
      {dashboardTab === "orders" && (
        <>
          <Card className="rounded-xl border-0 bg-white shadow-sm dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5" />
                الطلبات المسجلة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "month" | "quarter" | "year")}
                  className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:w-auto sm:min-w-[120px]"
                >
                  <option value="month">شهري</option>
                  <option value="quarter">ربع سنوي</option>
                  <option value="year">سنوي</option>
                </select>
                {reportType === "month" && (
                  <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground">الشهر:</span>
                    <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:w-auto" />
                  </label>
                )}
                {reportType === "quarter" && (
                  <>
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">السنة:</span>
                      <input type="number" min={2020} max={2030} value={reportQuarter.split("-")[0]} onChange={(e) => setReportQuarter(`${e.target.value}-${reportQuarter.split("-")[1] || 1}`)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:w-24" />
                    </label>
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">الربع:</span>
                      <select value={reportQuarter.split("-")[1]} onChange={(e) => setReportQuarter(`${reportQuarter.split("-")[0]}-${e.target.value}`)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:w-auto">
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
                    <input type="number" min={2020} max={2030} value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:w-24" />
                  </label>
                )}
                <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto" onClick={handleDownloadReport} disabled={ordersForPeriod.length === 0 || reportLoading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {reportLoading ? "جاري التصدير..." : "تحميل تقرير PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => {
                    const rows = ordersForPeriod.map((o, i) => {
                      const gifts = (o.items ?? []).map((it) => `${it.name} (${it.quantity})`).join(" - ");
                      return [i + 1, o.date ?? "", o.requesterName ?? "", gifts, o.totalPieces ?? 0, (o.notes ?? "").replace(/\s+/g, " ")];
                    });
                    const header = ["رقم", "التاريخ", "الجهة الطالبة", "الهدايا", "القطع", "ملاحظات"];
                    const csv = "\uFEFF" + [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `طلبات-${periodLabel.replace(/\s+/g, "-")}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  disabled={ordersForPeriod.length === 0}
                >
                  <Download className="ml-2 h-4 w-4" /> تصدير CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => {
                    const data = getStoredOrders();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `orders-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    notifySuccess("تم تنزيل نسخة الطلبات.");
                  }}
                >
                  <Download className="ml-2 h-4 w-4" /> تصدير نسخة احتياطية
                </Button>
                <label className="inline-flex cursor-pointer min-h-[44px]">
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const inputEl = e.target;
                      const reader = new FileReader();
                      reader.onload = () => {
                        void (async () => {
                          try {
                            const parsed = JSON.parse(reader.result as string) as OrderRecord[];
                            if (!Array.isArray(parsed)) {
                              notifyError("الملف يجب أن يحتوي مصفوفة طلبات.");
                              return;
                            }
                            const ok = await confirm({
                              title: "استعادة الطلبات",
                              message: `سيتم استبدال ${orders.length} طلبية حالية بـ ${parsed.length} طلبية من الملف.\nهل تريد المتابعة؟`,
                              confirmLabel: "استعادة",
                              cancelLabel: "إلغاء",
                              danger: true,
                            });
                            if (!ok) return;
                            saveStoredOrders(parsed);
                            refreshOrders();
                            notifySuccess("تم استعادة الطلبات بنجاح.");
                          } catch {
                            notifyError("ملف غير صالح.");
                          } finally {
                            inputEl.value = "";
                          }
                        })();
                      };
                      reader.readAsText(file);
                    }}
                  />
                  <span className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer min-h-[44px]">
                    <Upload className="ml-2 h-4 w-4" /> استعادة من نسخة
                  </span>
                </label>
              </div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="text" placeholder="بحث في الطلبات..." value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} className="pr-10 min-h-[44px] text-base" />
              </div>
              <p className="text-sm text-muted-foreground">
                عدد الطلبات في {periodLabel}: {ordersDisplayed.length}
                {orderSearchQuery.trim() ? ` (مطابقة للبحث من ${ordersForPeriod.length})` : ""} — إجمالي القطع: {ordersDisplayed.reduce((s, o) => s + (o.totalPieces ?? 0), 0)}
              </p>
              <div className="overflow-x-auto rounded-xl border" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="w-full min-w-[640px] text-right text-sm">
                  <thead className="bg-muted/50">
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
                    {ordersDisplayed.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          {orderSearchQuery.trim() ? "لا توجد نتائج تطابق البحث" : "لا توجد طلبات في الفترة المحددة"}
                        </td>
                      </tr>
                    ) : (
                      ordersDisplayed.map((o, i) => {
                        const isToday = o.date === new Date().toISOString().slice(0, 10);
                        const isThisMonth =
                          (o.date?.slice(0, 7) ?? o.createdAt?.slice(0, 7)) ===
                          `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                        return (
                          <tr key={o.id} className={`border-t align-top hover:bg-muted/20 ${isToday ? "bg-green-50 dark:bg-green-950/20" : isThisMonth ? "bg-primary/5" : ""}`}>
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
                                    <li key={idx}>
                                      {it.name} ({it.quantity})
                                    </li>
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

          <Card className="rounded-xl border-0 bg-white shadow-sm dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                إحصائيات بصرية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">طلبات آخر 6 أشهر</p>
                <div className="space-y-2">
                  {last6Months.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm">{m.label}</span>
                      <div className="h-6 min-w-[60px] flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full rounded bg-brand-green-dark transition-all duration-300" style={{ width: `${(m.count / maxOrdersMonth) * 100}%` }} />
                      </div>
                      <span className="w-8 text-sm font-medium">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">توزيع الطلبات حسب الجهة الطالبة</p>
                <div className="space-y-2">
                  {byRequester.map((r) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="max-w-[140px] flex-1 truncate text-sm" title={r.name}>
                        {r.name}
                      </span>
                      <div className="h-5 max-w-[200px] min-w-[40px] flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full rounded bg-brand-gold/80 transition-all duration-300" style={{ width: `${(r.count / maxByRequester) * 100}%` }} />
                      </div>
                      <span className="w-6 text-sm font-medium">{r.count}</span>
                    </div>
                  ))}
                  {byRequester.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات مسجلة</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Restore typed confirmation modal */}
      {restorePending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="إغلاق" onClick={() => setRestorePending(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-5 shadow-2xl dark:bg-card space-y-4">
            <h2 className="text-lg font-semibold text-destructive">استعادة من ملف</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              سيتم استبدال جميع بيانات الهدايا الحالية بمحتوى الملف ({restorePending.length} هدية). هل تريد المتابعة؟
            </p>
            <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={() => { handleBackup(); notifySuccess("تم تنزيل نسخة احتياطية."); }}>
              <Download className="ml-2 h-4 w-4" />
              تحميل نسخة احتياطية أولاً
            </Button>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">
                اكتب كلمة <strong className="text-foreground">استعادة</strong> للتأكيد:
              </span>
              <Input
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                className="min-h-[44px]"
                placeholder="استعادة"
                autoFocus
              />
            </label>
            <div className="flex flex-wrap gap-2 justify-start">
              <Button
                type="button"
                variant="destructive"
                className="min-h-[44px]"
                disabled={restoreConfirmText.trim() !== "استعادة"}
                onClick={confirmRestore}
              >
                تأكيد الاستعادة
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setRestorePending(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
