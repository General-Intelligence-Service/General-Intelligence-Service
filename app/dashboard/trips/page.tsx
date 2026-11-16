"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Plane,
  Plus,
  Save,
  Search,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/products";
import type { Trip, TripGiftInput, TripStatus } from "@/types/trip";
import { useConfirm } from "@/components/confirm-dialog-provider";

type GiftDraft = TripGiftInput & { key: string };

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
    status: "open" as TripStatus,
    notes: "",
    gifts: [] as GiftDraft[],
  };
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

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

  const searchLower = normalize(query);
  const searchResults = useMemo(() => {
    if (!searchLower) return [];
    const out: Product[] = [];
    for (const p of products) {
      const hay = `${p.name} ${p.sku} ${p.slug}`.toLowerCase();
      if (hay.includes(searchLower)) out.push(p);
      if (out.length >= 15) break;
    }
    return out;
  }, [products, searchLower]);

  const filteredTrips = useMemo(() => {
    const q = normalize(filter);
    if (!q) return trips;
    return trips.filter((t) => {
      const hay = `${t.organization} ${t.recipient} ${t.destination} ${t.tripDate}`.toLowerCase();
      return hay.includes(q);
    });
  }, [trips, filter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setQuery("");
  };

  const openEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setForm({
      organization: trip.organization,
      recipient: trip.recipient,
      destination: trip.destination,
      tripDate: trip.tripDate,
      status: trip.status,
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
    setShowForm(true);
    setQuery("");
  };

  const addCatalogGift = (slug: string) => {
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
    setQuery("");
  };

  const addOtherGift = () => {
    setForm((prev) => ({
      ...prev,
      gifts: [
        ...prev.gifts,
        {
          key: newGiftKey(),
          giftType: "other",
          productSlug: null,
          customName: "",
          quantity: 1,
          deliveredTo: "",
          notes: "",
        },
      ],
    }));
  };

  const updateGift = (key: string, patch: Partial<GiftDraft>) => {
    setForm((prev) => ({
      ...prev,
      gifts: prev.gifts.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    }));
  };

  const removeGift = (key: string) => {
    setForm((prev) => ({ ...prev, gifts: prev.gifts.filter((g) => g.key !== key) }));
  };

  const handleSave = async () => {
    if (!form.organization.trim() || !form.recipient.trim() || !form.destination.trim()) {
      toast.error("أكمل الجهة والشخص المستلم وجهة الرحلة.");
      return;
    }
    if (form.gifts.length === 0) {
      toast.error("أضف هدية واحدة على الأقل.");
      return;
    }
    for (const g of form.gifts) {
      if (g.giftType === "other" && !String(g.customName ?? "").trim()) {
        toast.error("أدخل اسم الهدية في بند «أخرى».");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        organization: form.organization.trim(),
        recipient: form.recipient.trim(),
        destination: form.destination.trim(),
        tripDate: form.tripDate,
        status: form.status,
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
        toast.success(editingId ? "تم تحديث الرحلة." : "تم إنشاء الرحلة وخصم المخزون.");
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm());
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

  const handleDelete = async (trip: Trip) => {
    const ok = await confirm({
      title: "حذف الرحلة",
      message: `حذف رحلة «${trip.organization}»؟ سيتم إعادة كميات الهدايا الكتالوجية إلى المخزون.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success("تم حذف الرحلة وإعادة المخزون.");
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold">الرحلات</h1>
              <p className="text-muted-foreground">
                تسجيل الهدايا المسحوبة للرحلات من مخزون الموقع، مع إمكانية التعديل بعد عودة الوفد.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openCreate} className="min-h-[44px]">
                <Plus className="ml-2 h-5 w-5" />
                رحلة جديدة
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  <ArrowRight className="ml-2 h-4 w-4" />
                  العودة للوحة التحكم
                </Button>
              </Link>
            </div>
          </div>

          {showForm && (
            <Card className="mb-6 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5" />
                  {editingId ? "تعديل رحلة" : "رحلة جديدة"}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">الجهة</span>
                    <Input
                      value={form.organization}
                      onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                      className="min-h-[44px]"
                      placeholder="الجهة الطالبة / المنظمة"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">الشخص المستلم</span>
                    <Input
                      value={form.recipient}
                      onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
                      className="min-h-[44px]"
                      placeholder="اسم المستلم"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">جهة الرحلة</span>
                    <Input
                      value={form.destination}
                      onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                      className="min-h-[44px]"
                      placeholder="الوجهة"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">التاريخ</span>
                    <Input
                      type="date"
                      value={form.tripDate}
                      onChange={(e) => setForm((p) => ({ ...p, tripDate: e.target.value }))}
                      className="min-h-[44px]"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium shrink-0">حالة الرحلة</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, status: e.target.value === "returned" ? "returned" : "open" }))
                    }
                    className="min-h-[44px] rounded-md border border-input bg-background px-3"
                  >
                    <option value="open">قيد الرحلة</option>
                    <option value="returned">عاد الوفد</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm block">
                  <span className="font-medium">ملاحظات</span>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="min-h-[44px]"
                    placeholder="اختياري"
                  />
                </label>

                <div className="rounded-md border bg-background p-3 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-sm">الهدايا المسحوبة</p>
                    <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={addOtherGift}>
                      <Plus className="ml-2 h-4 w-4" />
                      أخرى (ليست في الموقع)
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ابحث في مخزون الموقع لإضافة هدية..."
                      className="min-h-[44px] pr-10"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="max-h-48 overflow-auto rounded-md border divide-y">
                      {searchResults.map((p) => (
                        <li key={p.slug}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm hover:bg-muted/60 min-h-[44px]"
                            onClick={() => addCatalogGift(p.slug)}
                          >
                            <span className="truncate font-medium">{p.name}</span>
                            <Badge variant="outline">المتوفر: {p.availableQuantity ?? 0}</Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {form.gifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد هدايا بعد. اختر من المخزون أو أضف «أخرى».</p>
                  ) : (
                    <ul className="space-y-3">
                      {form.gifts.map((g) => {
                        const product = g.productSlug ? bySlug.get(g.productSlug) : null;
                        return (
                          <li key={g.key} className="rounded-md border p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {g.giftType === "catalog" ? (
                                  <p className="font-medium truncate">
                                    {product?.name || g.productSlug}
                                    <Badge className="mr-2" variant="secondary">
                                      من المخزون
                                    </Badge>
                                  </p>
                                ) : (
                                  <Input
                                    value={g.customName ?? ""}
                                    onChange={(e) => updateGift(g.key, { customName: e.target.value })}
                                    placeholder="اسم الهدية (أخرى)"
                                    className="min-h-[44px]"
                                  />
                                )}
                                {g.giftType === "catalog" && product && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    المتوفر حالياً: {product.availableQuantity ?? 0}
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="min-h-[44px] min-w-[44px] text-destructive"
                                onClick={() => removeGift(g.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label className="space-y-1 text-xs">
                                الكمية
                                <Input
                                  type="number"
                                  min={1}
                                  value={g.quantity}
                                  onChange={(e) =>
                                    updateGift(g.key, {
                                      quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                                    })
                                  }
                                  className="min-h-[44px]"
                                />
                              </label>
                              <label className="space-y-1 text-xs sm:col-span-2">
                                سُلّمت إلى (بعد عودة الوفد)
                                <Input
                                  value={g.deliveredTo ?? ""}
                                  onChange={(e) => updateGift(g.key, { deliveredTo: e.target.value })}
                                  className="min-h-[44px]"
                                  placeholder="اسم الشخص الذي استلم الهدية"
                                />
                              </label>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <Button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
                  <Save className="ml-2 h-5 w-5" />
                  {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "حفظ الرحلة وخصم المخزون"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">سجل الرحلات</CardTitle>
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="بحث في الرحلات..."
                  className="min-h-[44px] sm:max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">جاري التحميل...</p>
              ) : filteredTrips.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد رحلات مسجّلة بعد.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredTrips.map((trip) => (
                    <li key={trip.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-lg">{trip.organization}</p>
                            <Badge variant={trip.status === "returned" ? "default" : "outline"}>
                              {trip.status === "returned" ? "عاد الوفد" : "قيد الرحلة"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            المستلم: <span className="text-foreground">{trip.recipient}</span>
                            {" · "}
                            الوجهة: <span className="text-foreground">{trip.destination}</span>
                            {" · "}
                            {trip.tripDate}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm">
                            {trip.gifts.map((g) => (
                              <li key={g.id} className="flex flex-wrap gap-x-2">
                                <span>
                                  {g.giftType === "other"
                                    ? g.customName || "أخرى"
                                    : g.productName || g.productSlug}{" "}
                                  × {g.quantity}
                                </span>
                                {g.deliveredTo && (
                                  <span className="text-muted-foreground">→ سُلّمت إلى: {g.deliveredTo}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => openEdit(trip)}
                          >
                            <Pencil className="ml-2 h-4 w-4" />
                            تعديل
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] text-destructive"
                            onClick={() => void handleDelete(trip)}
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
