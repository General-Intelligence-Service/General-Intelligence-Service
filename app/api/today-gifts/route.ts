import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  getTodayGiftSlugs,
  isTodayGiftsDbConfigured,
  setTodayGiftSlugs,
} from "@/lib/today-gifts-db";

function isoDayOrToday(v: string | null): string {
  const day = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    if (!isTodayGiftsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const day = isoDayOrToday(searchParams.get("day"));
    const slugs = await getTodayGiftSlugs(day);
    return NextResponse.json({ success: true, day, slugs });
  } catch (e) {
    console.error("GET /api/today-gifts:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب هدايا اليوم" }, { status: 500 });
  }
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
    const body = (await request.json()) as { day?: string; slugs?: unknown };
    const day = isoDayOrToday(typeof body.day === "string" ? body.day : null);
    const slugs = Array.isArray(body.slugs) ? body.slugs.map(String) : [];
    await setTodayGiftSlugs(day, slugs);
    return NextResponse.json({ success: true, day, slugs });
  } catch (e) {
    console.error("PUT /api/today-gifts:", e);
    return NextResponse.json({ success: false, error: "فشل في حفظ هدايا اليوم" }, { status: 500 });
  }
}

