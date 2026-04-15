"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GripVertical, Plus, Save, Search, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/products";

type Item = { slug: string; outQty: number; inQty: number };

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalize(s: string): string {
  return (s ?? "").toLowerCase().trim();
}

export default function WarehousePage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  const [day, setDay] = useState<string>(isoToday());
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const dragFromIndexRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products?quick=1", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; data?: Product[] };
      if (json.success && Array.isArray(json.data)) setProducts(json.data);
    } catch {
      //
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (authOk) void fetchProducts();
  }, [authOk, fetchProducts]);

  const pickedSet = useMemo(() => new Set(items.map((i) => i.slug)), [items]);
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p] as const)), [products]);

  const searchLower = normalize(query);
  const searchResults = useMemo(() => {
    if (!searchLower) return [];
    const out: Product[] = [];
    for (const p of products) {
      const hay = `${p.name} ${p.sku} ${p.slug}`.toLowerCase();
      if (hay.includes(searchLower)) out.push(p);
      if (out.length >= 20) break;
    }
    return out;
  }, [products, searchLower]);

  const addItem = (slug: string) => {
    setItems((prev) => (prev.some((x) => x.slug === slug) ? prev : [...prev, { slug, outQty: 0, inQty: 0 }]));
  };

  const removeItem = (slug: string) => setItems((prev) => prev.filter((x) => x.slug !== slug));

  const moveItem = (from: number, to: number) => {
    setItems((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      if (from === to) return prev;
      const next = prev.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const setQty = (slug: string, field: "outQty" | "inQty", value: string) => {
    const v = Math.max(0, Math.min(999999, Math.floor(Number(value.replace(/[^\d]/g, "")) || 0)));
    setItems((prev) => prev.map((it) => (it.slug === slug ? { ...it, [field]: v } : it)));
  };

  const onDragStart = (index: number) => (dragFromIndexRef.current = index);
  const onDropOn = (index: number) => {
    const from = dragFromIndexRef.current;
    dragFromIndexRef.current = null;
    if (from == null) return;
    moveItem(from, index);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/warehouse", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day, items }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; appliedCount?: number };
      if (res.ok && json.success) {
        toast.success(`تم حفظ حركة المستودع وتعديل المخزون (${json.appliedCount ?? 0} صنف).`);
      } else if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/warehouse");
      } else {
        toast.error(json.error || "تعذر الحفظ.");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold">حركة المستودع اليومية</h1>
              <p className="text-muted-foreground">سجّل الوارد والصادر للمستودع لهذا اليوم، وسيتم تعديل المخزون تلقائيًا.</p>
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
                  <Warehouse className="h-5 w-5" />
                  اليوم
                </CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    التاريخ:
                    <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="min-h-[44px] w-[170px]" />
                  </label>
                  <Button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px]">
                    <Save className="ml-2 h-5 w-5" />
                    {saving ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground">لا توجد أصناف ضمن حركة اليوم بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it, idx) => {
                    const p = bySlug.get(it.slug);
                    return (
                      <li
                        key={it.slug}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropOn(idx)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 rounded border bg-muted px-2 py-1 text-xs tabular-nums">{idx + 1}</div>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{p?.name ?? it.slug}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {p?.sku && <Badge variant="outline">كود: {p.sku}</Badge>}
                              <Badge variant="outline">Slug: {it.slug}</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                صادر:
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={String(it.outQty ?? 0)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setQty(it.slug, "outQty", e.target.value)}
                                  className="w-28 min-h-[44px] text-center tabular-nums"
                                />
                              </label>
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                وارد:
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={String(it.inQty ?? 0)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setQty(it.slug, "inQty", e.target.value)}
                                  className="w-28 min-h-[44px] text-center tabular-nums"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => moveItem(idx, Math.max(0, idx - 1))} disabled={idx === 0}>
                            ↑
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => moveItem(idx, Math.min(items.length - 1, idx + 1))} disabled={idx === items.length - 1}>
                            ↓
                          </Button>
                          <Button type="button" variant="destructive" size="sm" className="min-h-[44px]" onClick={() => removeItem(it.slug)}>
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بحث وإضافة صنف</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">ابحث بالاسم أو الكود (SKU) أو slug ثم اضغط إضافة.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="text" placeholder="بحث..." value={query} onChange={(e) => setQuery(e.target.value)} className="pr-10 min-h-[44px] text-base" />
              </div>

              {loadingProducts ? (
                <p className="text-muted-foreground">جاري تحميل الأصناف...</p>
              ) : query.trim() === "" ? (
                <p className="text-muted-foreground text-sm">اكتب للبحث عن صنف.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد نتائج.</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((p) => {
                    const already = pickedSet.has(p.slug);
                    return (
                      <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">كود: {p.sku}</Badge>
                            <Badge variant="outline">Slug: {p.slug}</Badge>
                          </div>
                        </div>
                        <Button type="button" onClick={() => addItem(p.slug)} disabled={already} className="min-h-[44px] shrink-0">
                          <Plus className="ml-2 h-5 w-5" />
                          {already ? "مضاف" : "إضافة"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

