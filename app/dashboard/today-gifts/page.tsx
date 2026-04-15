"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GripVertical, Plus, Save, Search, Trash2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/products";

type TodayGiftsResponse =
  | { success: true; day: string; slugs: string[] }
  | { success: false; error?: string };

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalize(s: string): string {
  return (s ?? "").toLowerCase().trim();
}

export default function TodayGiftsDashboardPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  const [day, setDay] = useState<string>(isoToday());
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [pickedSlugs, setPickedSlugs] = useState<string[]>([]);

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
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      }
    } catch {
      //
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchPicks = useCallback(
    async (d: string) => {
      setLoadingPicks(true);
      try {
        const res = await fetch(`/api/today-gifts?day=${encodeURIComponent(d)}`);
        const json = (await res.json()) as TodayGiftsResponse;
        if (json && json.success) {
          setPickedSlugs(Array.isArray(json.slugs) ? json.slugs : []);
        } else {
          // إذا ما في DB أو خطأ: نخليها فارغة ونعرض رسالة عند الحفظ
          setPickedSlugs([]);
        }
      } catch {
        setPickedSlugs([]);
      } finally {
        setLoadingPicks(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authOk) {
      void fetchProducts();
      void fetchPicks(day);
    }
  }, [authOk, fetchProducts, fetchPicks, day]);

  const pickedSet = useMemo(() => new Set(pickedSlugs), [pickedSlugs]);

  const bySlug = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.slug, p);
    return map;
  }, [products]);

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

  const pickedProducts = useMemo(() => {
    return pickedSlugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is Product => Boolean(p));
  }, [pickedSlugs, bySlug]);

  const addPick = (slug: string) => {
    setPickedSlugs((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
  };

  const removePick = (slug: string) => {
    setPickedSlugs((prev) => prev.filter((s) => s !== slug));
  };

  const movePick = (from: number, to: number) => {
    setPickedSlugs((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      if (from === to) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const onDragStart = (index: number) => {
    dragFromIndexRef.current = index;
  };
  const onDropOn = (index: number) => {
    const from = dragFromIndexRef.current;
    dragFromIndexRef.current = null;
    if (from == null) return;
    movePick(from, index);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/today-gifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day, slugs: pickedSlugs }),
      });
      const json = (await res.json()) as TodayGiftsResponse;
      if (res.ok && json.success) {
        alert("تم حفظ هدايا اليوم بنجاح.");
      } else if (res.status === 401) {
        alert("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/today-gifts");
      } else {
        alert(json.success ? "تعذر الحفظ" : json.error || "تعذر الحفظ");
      }
    } catch {
      alert("حدث خطأ أثناء الحفظ.");
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

  if (authOk === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold">إعداد هدايا اليوم</h1>
              <p className="text-muted-foreground">
                اختر الهدايا لليوم ورتّبها بالسحب ثم اضغط حفظ. (لا يتم تعديل بيانات الهدية نفسها)
              </p>
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
                <CardTitle className="text-lg">اليوم</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    التاريخ:
                    <Input
                      type="date"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="min-h-[44px] w-[170px]"
                    />
                  </label>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="min-h-[44px]"
                  >
                    <Save className="ml-2 h-5 w-5" />
                    {saving ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPicks ? (
                <p className="text-muted-foreground">جاري تحميل قائمة اليوم...</p>
              ) : pickedSlugs.length === 0 ? (
                <p className="text-muted-foreground">لا توجد هدايا محددة لهذا اليوم بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {pickedSlugs.map((slug, idx) => {
                    const p = bySlug.get(slug);
                    return (
                      <li
                        key={slug}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropOn(idx)}
                        title="اسحب لإعادة الترتيب"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 rounded border bg-muted px-2 py-1 text-xs tabular-nums">
                            {idx + 1}
                          </div>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {p?.name ?? slug}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {p?.sku && <Badge variant="outline">كود: {p.sku}</Badge>}
                              <Badge variant="outline">Slug: {slug}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => movePick(idx, Math.max(0, idx - 1))}
                            disabled={idx === 0}
                            title="تحريك للأعلى"
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => movePick(idx, Math.min(pickedSlugs.length - 1, idx + 1))}
                            disabled={idx === pickedSlugs.length - 1}
                            title="تحريك للأسفل"
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => removePick(slug)}
                            title="إزالة من اليوم"
                          >
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
              <CardTitle className="text-lg">بحث وإضافة</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ابحث بالاسم أو الكود (SKU) أو الـ slug، ثم اضغط إضافة.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="بحث..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-10 min-h-[44px] text-base"
                />
              </div>

              {loadingProducts ? (
                <p className="text-muted-foreground">جاري تحميل الهدايا...</p>
              ) : query.trim() === "" ? (
                <p className="text-muted-foreground text-sm">اكتب للبحث عن هدية.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد نتائج.</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((p) => {
                    const already = pickedSet.has(p.slug);
                    return (
                      <li
                        key={p.slug}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">كود: {p.sku}</Badge>
                            <Badge variant="outline">Slug: {p.slug}</Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => addPick(p.slug)}
                          disabled={already}
                          className="min-h-[44px] shrink-0"
                        >
                          <Plus className="ml-2 h-5 w-5" />
                          {already ? "مضاف" : "إضافة إلى اليوم"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!loadingProducts && products.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لم يتم تحميل قائمة الهدايا. تحقق من الاتصال أو صلاحيات الدخول.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

