"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Search, X } from "lucide-react";
import { DashboardLayout } from "@/app/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  formatAuditTime,
} from "@/lib/audit-labels";
import type { AuditLogRow } from "@/lib/audit-log";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

type Filters = {
  actor: string;
  action: string;
  result: string;
  q: string;
  from: string;
  to: string;
  page: number;
};

const emptyFilters: Filters = {
  actor: "",
  action: "",
  result: "",
  q: "",
  from: "",
  to: "",
  page: 1,
};

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    name: "الاسم",
    sku: "الكود",
    shortDescription: "الوصف",
    contents: "المحتويات",
    giftTier: "المستوى",
    images: "الصور",
    availableQuantity: "الكمية",
    category: "التصنيف",
    price: "السعر",
    archived: "مؤرشف",
    hidden: "مخفي",
  };
  return map[key] ?? key;
}

function formatVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function ActivityPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (f.actor) sp.set("actor", f.actor);
      if (f.action) sp.set("action", f.action);
      if (f.result) sp.set("result", f.result);
      if (f.q) sp.set("q", f.q);
      if (f.from) sp.set("from", f.from);
      if (f.to) sp.set("to", f.to);
      sp.set("page", String(f.page));
      sp.set("pageSize", "50");
      const res = await fetch(`/api/audit?${sp}`, { credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        notifyError(json.error || "فشل التحميل");
        return;
      }
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
      setPageSize(json.pageSize ?? 50);
    } catch {
      notifyError("فشل الاتصال");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const applyFilters = () => {
    setFilters({ ...draft, page: 1 });
  };

  const exportCsv = () => {
    const sp = new URLSearchParams();
    if (filters.actor) sp.set("actor", filters.actor);
    if (filters.action) sp.set("action", filters.action);
    if (filters.result) sp.set("result", filters.result);
    if (filters.q) sp.set("q", filters.q);
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
    window.location.href = `/api/audit/export?${sp}`;
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fieldClass =
    "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-brand-green-dark/20";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-green-dark dark:text-brand-gold-light">
              سجل النشاط
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              للإضافة فقط — لا يمكن تعديل أو حذف السجلات من الواجهة
            </p>
          </div>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>

        <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <input
            className={fieldClass}
            placeholder="بحث..."
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
          <input
            className={fieldClass}
            placeholder="المستخدم"
            value={draft.actor}
            onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
            dir="ltr"
          />
          <select
            className={fieldClass}
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          >
            <option value="">كل العمليات</option>
            {AUDIT_ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={draft.result}
            onChange={(e) => setDraft({ ...draft, result: e.target.value })}
          >
            <option value="">كل النتائج</option>
            <option value="success">نجاح</option>
            <option value="failure">فشل</option>
          </select>
          <input
            type="date"
            className={fieldClass}
            value={draft.from}
            onChange={(e) =>
              setDraft({
                ...draft,
                from: e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
              })
            }
          />
          <input
            type="date"
            className={fieldClass}
            value={draft.to}
            onChange={(e) =>
              setDraft({
                ...draft,
                to: e.target.value ? `${e.target.value}T23:59:59.999Z` : "",
              })
            }
          />
          <Button
            type="button"
            className="bg-brand-green-dark text-white sm:col-span-2 xl:col-span-6"
            onClick={applyFilters}
          >
            <Search className="ml-2 h-4 w-4" />
            تطبيق الفلاتر
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل...
          </div>
        ) : (
          <>
            {/* جوال: بطاقات */}
            <div className="space-y-3 md:hidden">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد سجلات</p>
              ) : (
                rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelected(row)}
                    className="w-full rounded-xl border bg-card p-3 text-right"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {auditActionLabel(row.action)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          row.result === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {row.result === "success" ? "نجاح" : "فشل"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAuditTime(row.timestamp)}
                    </p>
                    <p className="mt-1 truncate text-xs">{row.actorEmail}</p>
                    {row.targetLabel && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {row.targetLabel}
                      </p>
                    )}
                    {row.ip && (
                      <p className="mt-1 text-[10px] text-muted-foreground dir-ltr text-left">
                        {row.ip}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* سطح المكتب: جدول */}
            <div className="hidden overflow-x-auto rounded-xl border md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-right">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">الوقت</th>
                    <th className="px-3 py-2.5 font-semibold">المستخدم</th>
                    <th className="px-3 py-2.5 font-semibold">العملية</th>
                    <th className="px-3 py-2.5 font-semibold">الهدف</th>
                    <th className="px-3 py-2.5 font-semibold">النتيجة</th>
                    <th className="px-3 py-2.5 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        لا توجد سجلات
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t hover:bg-muted/40"
                        onClick={() => setSelected(row)}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {formatAuditTime(row.timestamp)}
                        </td>
                        <td className="px-3 py-2.5 dir-ltr text-left">{row.actorEmail}</td>
                        <td className="px-3 py-2.5">{auditActionLabel(row.action)}</td>
                        <td className="max-w-[200px] truncate px-3 py-2.5">
                          {row.targetLabel || row.targetId || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              row.result === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            )}
                          >
                            {row.result === "success" ? "نجاح" : "فشل"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 dir-ltr text-left text-xs text-muted-foreground">
                          {row.ip || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {total} سجل — صفحة {filters.page} من {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  السابق
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="إغلاق"
              onClick={() => setSelected(null)}
            />
            <div
              role="dialog"
              aria-modal
              className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {auditActionLabel(selected.action)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {formatAuditTime(selected.timestamp)}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                  onClick={() => setSelected(null)}
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">المستخدم</dt>
                  <dd className="dir-ltr text-left">{selected.actorEmail}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">النتيجة</dt>
                  <dd>{selected.result === "success" ? "نجاح" : "فشل"}</dd>
                </div>
                {selected.targetLabel && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">الهدف</dt>
                    <dd className="text-left">{selected.targetLabel}</dd>
                  </div>
                )}
                {selected.targetId && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">المعرّف</dt>
                    <dd className="dir-ltr text-left">{selected.targetId}</dd>
                  </div>
                )}
                {selected.ip && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">IP</dt>
                    <dd className="dir-ltr text-left">{selected.ip}</dd>
                  </div>
                )}
                {selected.userAgent && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">المتصفح</dt>
                    <dd className="break-all text-xs dir-ltr text-left">
                      {selected.userAgent}
                    </dd>
                  </div>
                )}
              </dl>
              {selected.changes && Object.keys(selected.changes).length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  <p className="text-sm font-semibold">التغييرات</p>
                  {Object.entries(selected.changes).map(([field, ch]) => (
                    <div key={field} className="rounded-md bg-muted/50 p-2 text-xs">
                      <p className="mb-1 font-medium">{fieldLabel(field)}</p>
                      <p className="text-red-700 dark:text-red-300">
                        ← {formatVal(ch.from)}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-300">
                        → {formatVal(ch.to)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
