import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import { applyWarehouseEntriesAndUpdateStock } from "@/lib/gift-movements-db";

export const dynamic = "force-dynamic";

function isoDayOrToday(v: string | null): string {
  const day = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date().toISOString().slice(0, 10);
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTodayGiftsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = (await request.json()) as { day?: string; items?: unknown };
    const day = isoDayOrToday(typeof body.day === "string" ? body.day : null);
    const items = Array.isArray(body.items) ? (body.items as any[]) : [];
    const normalized = items.map((x) => ({
      slug: String(x?.slug ?? "").trim(),
      outQty: Math.max(0, Math.floor(Number(x?.outQty ?? 0) || 0)),
      inQty: Math.max(0, Math.floor(Number(x?.inQty ?? 0) || 0)),
    })).filter((i) => i.slug);

    const applied = await applyWarehouseEntriesAndUpdateStock(day, normalized, session.email);
    return NextResponse.json({ success: true, day, appliedCount: applied.appliedCount });
  } catch (e) {
    console.error("PUT /api/warehouse:", e);
    return NextResponse.json({ success: false, error: "فشل في حفظ حركة المستودع" }, { status: 500 });
  }
}

