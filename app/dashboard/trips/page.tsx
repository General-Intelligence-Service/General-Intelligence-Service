"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plane,
  Plus,
  Save,
  Search,
  Trash2,
  Pencil,
  X,
  Eye,
  Undo2,
  Package,
  Luggage,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/app/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/products";
import type { Trip, TripGiftInput } from "@/types/trip";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { cn } from "@/lib/utils";

type GiftDraft = TripGiftInput & { key: string };
type StatusFilter = "all" | "open" | "returned";
type SortOrder = "newest" | "oldest";
type ReturnDraft = Record<string, { deliveredQty: number; returnedQty: number; deliveredTo: string }>;

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalize(s: string): string {
  return (s ?? "").toLowerCase().trim();
}

function newGiftKey(): string {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyForm() {
  return {
    organization: "",
    recipient: "",
    destination: "",
    tripDate: isoToday(),
    returnDate: "",
    notes: "",
    gifts: [] as GiftDraft[],
  };
}

function giftLabel(g: { giftType: string; productName?: string | null; productSlug?: string | null; customName?: string | null }) {
  if (g.giftType === "other") return g.customName || "أخرى";
  return g.productName || g.productSlug || "هدية";
}

function tripGiftsCount(trip: Trip): number {
  return trip.gifts.reduce((sum, g) => sum + g.quantity, 0);
}

export default function TripsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [returnTrip, setReturnTrip] = useState<Trip | null>(null);
  const [returnDraft, setReturnDraft] = useState<ReturnDraft>({});
  const [form, setForm] = useState(emptyForm);
  const [giftQuery, setGiftQuery] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login?next=/dashboard/trips");
  }, [authOk, router]);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trips", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; trips?: Trip[]; error?: string };
      if (res.ok && json.success && Array.isArray(json.trips)) {
        setTrips(json.trips);
      } else if (res.status === 401) {
        router.replace("/login?next=/dashboard/trips");
      } else {
        toast.error(json.error || "تعذر جلب الرحلات.");
      }
    } catch {
      toast.error("حدث خطأ أثناء جلب الرحلات.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?quick=1", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; data?: Product[] };
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data.filter((p) => !p.archived));
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    if (authOk) {
      void fetchTrips();
      void fetchProducts();
    }
  }, [authOk, fetchTrips, fetchProducts]);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p] as const)), [products]);

  const stats = useMemo(() => {
    const total = trips.length;
    const open = trips.filter((t) => t.status === "open").length;
    const withdrawn = trips.reduce((s, t) => s + tripGiftsCount(t), 0);
    const returned = trips.reduce(
      (s, t) => s + t.gifts.reduce((gs, g) => gs + (g.returnedQty || 0), 0),
      0
    );
    return { total, open, withdrawn, returned };
  }, [trips]);

  const giftSearchLower = normalize(giftQuery);
  const searchResults = useMemo(() => {
    if (!giftSearchLower) return [];
    const out: Product[] = [];
    for (const p of products) {
      const hay = `${p.name} ${p.sku} ${p.slug}`.toLowerCase();
      if (hay.includes(giftSearchLower)) out.push(p);
      if (out.length >= 12) break;
    }
    return out;
  }, [products, giftSearchLower]);

  const filteredTrips = useMemo(() => {
    const q = normalize(listQuery);
    let list = trips;
    if (statusFilter === "open") list = list.filter((t) => t.status === "open");
    if (statusFilter === "returned") list = list.filter((t) => t.status === "returned");
    if (q) {
      list = list.filter((t) => {
        const hay = `${t.organization} ${t.recipient} ${t.destination} ${t.tripDate}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...list].sort((a, b) => {
      const av = `${a.tripDate}-${a.createdAt}`;
      const bv = `${b.tripDate}-${b.createdAt}`;
      return sortOrder === "newest" ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
    });
    return sorted;
  }, [trips, listQuery, statusFilter, sortOrder]);

  const withdrawSummary = useMemo(
    () => form.gifts.reduce((s, g) => s + Math.max(1, Number(g.quantity) || 1), 0),
    [form.gifts]
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setGiftQuery("");
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawerOpen(true);
    setGiftQuery("");
  };

  const openEdit = (trip: Trip) => {
    if (trip.status === "returned") {
      toast.error("لا يمكن تعديل رحلة مكتملة.");
      return;
    }
    setEditingId(trip.id);
    setForm({
      organization: trip.organization,
      recipient: trip.recipient,
      destination: trip.destination,
      tripDate: trip.tripDate,
      returnDate: trip.returnDate ?? "",
      notes: trip.notes ?? "",
      gifts: trip.gifts.map((g) => ({
        key: g.id || newGiftKey(),
        giftType: g.giftType,
        productSlug: g.productSlug,
        customName: g.customName,
        quantity: g.quantity,
        deliveredTo: g.deliveredTo,
        notes: g.notes,
      })),
    });
    setDrawerOpen(true);
    setGiftQuery("");
  };

  const openReturn = (trip: Trip) => {
    if (trip.status === "returned") return;
    const draft: ReturnDraft = {};
    for (const g of trip.gifts) {
      draft[g.id] = {
        deliveredQty: g.quantity,
        returnedQty: 0,
        deliveredTo: g.deliveredTo ?? "",
      };
    }
    setReturnDraft(draft);
    setReturnTrip(trip);
  };

  const addCatalogGift = (slug: string) => {
    const product = bySlug.get(slug);
    const available = product?.availableQuantity ?? 0;
    if (available < 1) {
      toast.error("لا توجد كمية متوفرة لهذه الهدية.");
      return;
    }
    setForm((prev) => {
      if (prev.gifts.some((g) => g.giftType === "catalog" && g.productSlug === slug)) return prev;
      return {
        ...prev,
        gifts: [
          ...prev.gifts,
          {
            key: newGiftKey(),
            giftType: "catalog",
            productSlug: slug,
            customName: null,
            quantity: 1,
            deliveredTo: "",
            notes: "",
          },
        ],
      };
    });
    setGiftQuery("");
  };

  const updateGift = (key: string, patch: Partial<GiftDraft>) => {
    setForm((prev) => ({
      ...prev,
      gifts: prev.gifts.map((g) => {
        if (g.key !== key) return g;
        const next = { ...g, ...patch };
        if (next.giftType === "catalog" && next.productSlug) {
          const product = bySlug.get(next.productSlug);
          const available = product?.availableQuantity ?? 0;
          // عند التعديل: المتوفر الحالي + الكمية السابقة في الرحلة (إن وُجدت)
          const prevQty = editingId
            ? trips.find((t) => t.id === editingId)?.gifts.find((tg) => tg.productSlug === next.productSlug)?.quantity ?? 0
            : 0;
          const max = available + prevQty;
          if (Number(next.quantity) > max) {
            next.quantity = Math.max(1, max);
            toast.error(`الكمية تتجاوز المتوفر (${max}).`);
          }
        }
        return next;
      }),
    }));
  };

  const removeGift = (key: string) => {
    setForm((prev) => ({ ...prev, gifts: prev.gifts.filter((g) => g.key !== key) }));
  };

  const handleSave = async () => {
    if (!form.organization.trim() || !form.recipient.trim() || !form.destination.trim()) {
      toast.error("أكمل الوجهة واسم الوفد والمسؤول.");
      return;
    }
    if (form.gifts.length === 0) {
      toast.error("أضف هدية واحدة على الأقل.");
      return;
    }
    for (const g of form.gifts) {
      if (g.giftType === "catalog" && g.productSlug) {
        const product = bySlug.get(g.productSlug);
        const available = product?.availableQuantity ?? 0;
        const prevQty = editingId
          ? trips.find((t) => t.id === editingId)?.gifts.find((tg) => tg.productSlug === g.productSlug)?.quantity ?? 0
          : 0;
        const max = available + prevQty;
        if (g.quantity > max) {
          toast.error(`كمية «${product?.name || g.productSlug}» تتجاوز المتوفر (${max}).`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        organization: form.organization.trim(),
        recipient: form.recipient.trim(),
        destination: form.destination.trim(),
        tripDate: form.tripDate,
        returnDate: form.returnDate.trim() || null,
        notes: form.notes.trim() || null,
        gifts: form.gifts.map(({ key: _k, ...g }) => ({
          ...g,
          deliveredTo: String(g.deliveredTo ?? "").trim() || null,
          notes: String(g.notes ?? "").trim() || null,
        })),
      };
      const res = await fetch(editingId ? `/api/trips/${editingId}` : "/api/trips", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success(editingId ? "تم تحديث الرحلة." : "تم حفظ الرحلة وخصم المخزون.");
        closeDrawer();
        await fetchTrips();
        await fetchProducts();
      } else if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/trips");
      } else {
        toast.error(json.error || "تعذر الحفظ.");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const handleReturnSave = async () => {
    if (!returnTrip) return;
    for (const g of returnTrip.gifts) {
      const d = returnDraft[g.id];
      if (!d) continue;
      if (d.deliveredQty + d.returnedQty !== g.quantity) {
        toast.error(`مجموع المُسلَّمة والمُرجعة يجب أن يساوي ${g.quantity} لـ «${giftLabel(g)}».`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${returnTrip.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          returnDate: isoToday(),
          items: returnTrip.gifts.map((g) => ({
            giftId: g.id,
            deliveredQty: returnDraft[g.id]?.deliveredQty ?? 0,
            returnedQty: returnDraft[g.id]?.returnedQty ?? 0,
            deliveredTo: returnDraft[g.id]?.deliveredTo ?? null,
          })),
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success("تم تسجيل العودة وإعادة المُرجعة للمخزون.");
        setReturnTrip(null);
        await fetchTrips();
        await fetchProducts();
      } else {
        toast.error(json.error || "تعذر تسجيل العودة.");
      }
    } catch {
      toast.error("حدث خطأ أثناء تسجيل العودة.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trip: Trip) => {
    const ok = await confirm({
      title: "حذف الرحلة",
      message:
        trip.status === "open"
          ? `حذف رحلة «${trip.destination}»؟ سيتم إعادة كميات الهدايا الكتالوجية إلى المخزون.`
          : `حذف رحلة «${trip.destination}» المكتملة؟ لن يتأثر المخزون.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success("تم حذف الرحلة.");
        await fetchTrips();
        await fetchProducts();
      } else {
        toast.error(json.error || "تعذر الحذف.");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف.");
    }
  };

  if (authOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }
  if (authOk === false) return null;

  const statusBadge = (status: Trip["status"]) =>
    status === "returned" ? (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        مكتملة
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
        جارية
      </span>
    );

  return (
    <DashboardLayout>
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
          {/* Header row */}
          <div className="mb-6 flex flex-row items-start justify-between gap-3">
            <div className="min-w-0 text-right">
              <h1 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light sm:text-3xl">
                الرحلات
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                تسجيل سحب الهدايا للوفود ومتابعة العودة للمخزون
              </p>
            </div>
            <Button
              type="button"
              onClick={openCreate}
              className="min-h-[44px] shrink-0 bg-brand-green-dark hover:bg-brand-green-darker"
            >
              <Plus className="ml-2 h-5 w-5" />
              رحلة جديدة
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "إجمالي الرحلات", value: stats.total, icon: Plane, tone: "bg-brand-green-dark/10 text-brand-green-dark dark:text-brand-gold-light" },
              { label: "رحلات جارية", value: stats.open, icon: Clock3, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
              { label: "الهدايا المسحوبة", value: stats.withdrawn, icon: Package, tone: "bg-brand-gold/20 text-brand-green-dark dark:text-brand-gold-light" },
              { label: "الهدايا المُرجعة للمخزون", value: stats.returned, icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full", s.tone)}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="بحث في الرحلات..."
                className="min-h-[44px] pr-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", "الكل"],
                  ["open", "جارية"],
                  ["returned", "مكتملة"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    "min-h-[36px] rounded-full px-3 text-sm transition",
                    statusFilter === id
                      ? "bg-brand-green-dark text-white dark:bg-brand-gold dark:text-brand-green-darker"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="min-h-[36px] rounded-full border border-input bg-background px-3 text-sm"
                aria-label="ترتيب"
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="rounded-xl border bg-card shadow-sm">
            {loading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</p>
            ) : filteredTrips.length === 0 && trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
                  <Luggage className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-semibold">لا توجد رحلات بعد</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  ابدأ بتسجيل أول رحلة وسحب الهدايا من المخزون
                </p>
                <Button
                  type="button"
                  onClick={openCreate}
                  className="mt-6 min-h-[44px] bg-brand-green-dark hover:bg-brand-green-darker"
                >
                  <Plus className="ml-2 h-5 w-5" />
                  إضافة أول رحلة
                </Button>
              </div>
            ) : filteredTrips.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">لا نتائج مطابقة للبحث أو الفلتر.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground">
                        <th className="px-4 py-3 text-right font-medium">الوجهة / الرحلة</th>
                        <th className="px-4 py-3 text-right font-medium">الوفد</th>
                        <th className="px-4 py-3 text-right font-medium">تاريخ الذهاب</th>
                        <th className="px-4 py-3 text-right font-medium">تاريخ العودة</th>
                        <th className="px-4 py-3 text-right font-medium">الهدايا</th>
                        <th className="px-4 py-3 text-right font-medium">الحالة</th>
                        <th className="px-4 py-3 text-right font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.map((trip) => (
                        <tr key={trip.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{trip.destination}</td>
                          <td className="px-4 py-3">{trip.organization}</td>
                          <td className="px-4 py-3 tabular-nums">{trip.tripDate}</td>
                          <td className="px-4 py-3 tabular-nums">{trip.returnDate || "—"}</td>
                          <td className="px-4 py-3 tabular-nums">{tripGiftsCount(trip)}</td>
                          <td className="px-4 py-3">{statusBadge(trip.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                title="عرض"
                                onClick={() => setViewTrip(trip)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {trip.status === "open" && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    title="تعديل"
                                    onClick={() => openEdit(trip)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    title="تسجيل العودة"
                                    onClick={() => openReturn(trip)}
                                  >
                                    <Undo2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive"
                                title="حذف"
                                onClick={() => void handleDelete(trip)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="divide-y md:hidden">
                  {filteredTrips.map((trip) => (
                    <li key={trip.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{trip.destination}</p>
                          <p className="text-sm text-muted-foreground">{trip.organization}</p>
                        </div>
                        {statusBadge(trip.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>الذهاب: <span className="text-foreground tabular-nums">{trip.tripDate}</span></span>
                        <span>العودة: <span className="text-foreground tabular-nums">{trip.returnDate || "—"}</span></span>
                        <span>الهدايا: <span className="text-foreground tabular-nums">{tripGiftsCount(trip)}</span></span>
                        <span>المسؤول: <span className="text-foreground">{trip.recipient}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="min-h-[40px]" title="عرض" onClick={() => setViewTrip(trip)}>
                          <Eye className="ml-1 h-4 w-4" /> عرض
                        </Button>
                        {trip.status === "open" && (
                          <>
                            <Button type="button" variant="outline" size="sm" className="min-h-[40px]" title="تعديل" onClick={() => openEdit(trip)}>
                              <Pencil className="ml-1 h-4 w-4" /> تعديل
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="min-h-[40px]" title="تسجيل العودة" onClick={() => openReturn(trip)}>
                              <Undo2 className="ml-1 h-4 w-4" /> عودة
                            </Button>
                          </>
                        )}
                        <Button type="button" variant="outline" size="sm" className="min-h-[40px] text-destructive" title="حذف" onClick={() => void handleDelete(trip)}>
                          <Trash2 className="ml-1 h-4 w-4" /> حذف
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

      {/* Create / Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="إغلاق"
            onClick={closeDrawer}
          />
          <aside className="relative z-10 flex h-full w-full max-w-lg flex-col bg-background shadow-2xl sm:rounded-l-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plane className="h-5 w-5 text-brand-gold" />
                {editingId ? "تعديل رحلة" : "رحلة جديدة"}
              </h2>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={closeDrawer}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-brand-green-dark dark:text-brand-gold-light">1. بيانات الرحلة</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-medium">الوجهة</span>
                    <Input
                      value={form.destination}
                      onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                      className="min-h-[44px]"
                      placeholder="جهة الوجهة"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">اسم الوفد</span>
                    <Input
                      value={form.organization}
                      onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">المسؤول</span>
                    <Input
                      value={form.recipient}
                      onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">تاريخ الذهاب</span>
                    <Input
                      type="date"
                      value={form.tripDate}
                      onChange={(e) => setForm((p) => ({ ...p, tripDate: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">تاريخ العودة المتوقع</span>
                    <Input
                      type="date"
                      value={form.returnDate}
                      onChange={(e) => setForm((p) => ({ ...p, returnDate: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-brand-green-dark dark:text-brand-gold-light">2. الهدايا</h3>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={giftQuery}
                    onChange={(e) => setGiftQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الكود..."
                    className="min-h-[44px] pr-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <ul className="max-h-48 overflow-auto rounded-xl border divide-y">
                    {searchResults.map((p) => {
                      const thumb = p.images?.[0] || "";
                      return (
                        <li key={p.slug}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-right text-sm hover:bg-muted/60 min-h-[52px]"
                            onClick={() => addCatalogGift(p.slug)}
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                  placeholder="blur"
                                  blurDataURL={BLUR_DATA_URL}
                                />
                              ) : (
                                <Package className="m-auto h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                            <Badge variant="outline" className="shrink-0">
                              المتوفر: {p.availableQuantity ?? 0}
                            </Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {form.gifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">اختر هدايا من المخزون أعلاه.</p>
                ) : (
                  <ul className="space-y-3">
                    {form.gifts.map((g) => {
                      const product = g.productSlug ? bySlug.get(g.productSlug) : null;
                      const thumb = product?.images?.[0] || "";
                      const prevQty = editingId
                        ? trips.find((t) => t.id === editingId)?.gifts.find((tg) => tg.productSlug === g.productSlug)?.quantity ?? 0
                        : 0;
                      const available = (product?.availableQuantity ?? 0) + prevQty;
                      return (
                        <li key={g.key} className="rounded-xl border p-3 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {thumb ? (
                                <Image src={thumb} alt="" fill className="object-cover" sizes="48px" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                              ) : (
                                <Package className="m-auto mt-3 h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{product?.name || g.productSlug}</p>
                              <p className="text-xs text-muted-foreground">المتوفر: {available}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => removeGift(g.key)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <span className="shrink-0">الكمية</span>
                            <Input
                              type="number"
                              min={1}
                              max={Math.max(1, available)}
                              value={g.quantity}
                              onChange={(e) =>
                                updateGift(g.key, {
                                  quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                                })
                              }
                              className="min-h-[40px] w-24"
                            />
                            <span className="text-xs text-muted-foreground">/ {available}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-brand-green-dark dark:text-brand-gold-light">3. ملاحظات</h3>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="min-h-[44px]"
                  placeholder="اختياري"
                />
              </section>
            </div>

            <div className="border-t bg-card px-4 py-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                سيتم سحب <span className="font-semibold text-foreground tabular-nums">{withdrawSummary}</span> قطعة من المخزون
              </p>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[44px] w-full bg-brand-green-dark hover:bg-brand-green-darker"
              >
                <Save className="ml-2 h-5 w-5" />
                {saving ? "جاري الحفظ..." : "حفظ الرحلة"}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* View modal */}
      {viewTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="إغلاق" onClick={() => setViewTrip(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{viewTrip.destination}</h2>
                <p className="text-sm text-muted-foreground">{viewTrip.organization}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => setViewTrip(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">{statusBadge(viewTrip.status)}</div>
            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><dt className="text-muted-foreground">المسؤول</dt><dd className="font-medium">{viewTrip.recipient}</dd></div>
              <div><dt className="text-muted-foreground">الذهاب</dt><dd className="font-medium tabular-nums">{viewTrip.tripDate}</dd></div>
              <div><dt className="text-muted-foreground">العودة</dt><dd className="font-medium tabular-nums">{viewTrip.returnDate || "—"}</dd></div>
              <div><dt className="text-muted-foreground">الهدايا</dt><dd className="font-medium tabular-nums">{tripGiftsCount(viewTrip)}</dd></div>
            </dl>
            <ul className="space-y-2 text-sm">
              {viewTrip.gifts.map((g) => (
                <li key={g.id} className="rounded-lg border px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{giftLabel(g)}</span>
                    <span className="tabular-nums">× {g.quantity}</span>
                  </div>
                  {viewTrip.status === "returned" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      مُسلَّمة: {g.deliveredQty} · مُرجعة: {g.returnedQty}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {viewTrip.notes && <p className="mt-4 text-sm text-muted-foreground">ملاحظات: {viewTrip.notes}</p>}
          </div>
        </div>
      )}

      {/* Return modal */}
      {returnTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="إغلاق" onClick={() => setReturnTrip(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">تسجيل العودة</h2>
                <p className="text-sm text-muted-foreground">{returnTrip.destination} — {returnTrip.organization}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => setReturnTrip(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              لكل هدية: المُسلَّمة + المُرجعة = المسحوبة. الكمية المُرجعة تعود للمخزون تلقائياً.
            </p>
            <ul className="space-y-4">
              {returnTrip.gifts.map((g) => {
                const d = returnDraft[g.id] ?? { deliveredQty: g.quantity, returnedQty: 0, deliveredTo: "" };
                const sumOk = d.deliveredQty + d.returnedQty === g.quantity;
                return (
                  <li key={g.id} className={cn("rounded-xl border p-3 space-y-2", !sumOk && "border-destructive/50")}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{giftLabel(g)}</span>
                      <span className="text-muted-foreground tabular-nums">مسحوبة: {g.quantity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1 text-xs">
                        المُسلَّمة
                        <Input
                          type="number"
                          min={0}
                          max={g.quantity}
                          value={d.deliveredQty}
                          onChange={(e) => {
                            const deliveredQty = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            setReturnDraft((prev) => ({
                              ...prev,
                              [g.id]: {
                                ...d,
                                deliveredQty,
                                returnedQty: Math.max(0, g.quantity - deliveredQty),
                              },
                            }));
                          }}
                          className="min-h-[40px]"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        المُرجعة
                        <Input
                          type="number"
                          min={0}
                          max={g.quantity}
                          value={d.returnedQty}
                          onChange={(e) => {
                            const returnedQty = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            setReturnDraft((prev) => ({
                              ...prev,
                              [g.id]: {
                                ...d,
                                returnedQty,
                                deliveredQty: Math.max(0, g.quantity - returnedQty),
                              },
                            }));
                          }}
                          className="min-h-[40px]"
                        />
                      </label>
                    </div>
                    <label className="space-y-1 text-xs block">
                      سُلّمت إلى (اختياري)
                      <Input
                        value={d.deliveredTo}
                        onChange={(e) =>
                          setReturnDraft((prev) => ({
                            ...prev,
                            [g.id]: { ...d, deliveredTo: e.target.value },
                          }))
                        }
                        className="min-h-[40px]"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              onClick={handleReturnSave}
              disabled={saving}
              className="mt-5 min-h-[44px] w-full bg-brand-green-dark hover:bg-brand-green-darker"
            >
              <Save className="ml-2 h-5 w-5" />
              {saving ? "جاري الحفظ..." : "حفظ تسجيل العودة"}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
